#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/deploy/.env"
KUBECTL_BIN="${KUBECTL_BIN:-kubectl}"
KUBECONFIG_SOURCE="${KUBECONFIG_SOURCE:-/etc/rancher/k3s/k3s.yaml}"
FRPC_NAMESPACE="${FRPC_NAMESPACE:-nova-frp}"
FRPS_SERVER_ADDR="${FRPS_SERVER_ADDR:-frps.dlx.studio}"
FRPS_SERVER_PORT="${FRPS_SERVER_PORT:-7000}"
FRPS_SHARED_TOKEN="${FRPS_SHARED_TOKEN:-}"

load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  # shellcheck disable=SC1090
  set -a
  # shellcheck disable=SC1090
  source "$file"
  set +a
}

generate_token() {
  if command -v node >/dev/null 2>&1; then
    node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
    return
  fi
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
    return
  fi
  echo "${RANDOM}${RANDOM}${RANDOM}${RANDOM}"
}

load_env_file "$ENV_FILE"
if [[ -z "$FRPS_SHARED_TOKEN" ]]; then
  FRPS_SHARED_TOKEN="$(generate_token)"
  cat >"$ENV_FILE" <<EOF
FRPS_SHARED_TOKEN=$FRPS_SHARED_TOKEN
EOF
  chmod 600 "$ENV_FILE"
fi

usage() {
  cat <<EOF
Usage: $(basename "$0")

Bootstrap the shared frpc deployment inside K3s.

Required:
  FRPS_SHARED_TOKEN  shared frps/frpc authentication token

Optional overrides:
  FRPC_NAMESPACE     namespace to install into
  FRPS_SERVER_ADDR   frps endpoint hostname
  FRPS_SERVER_PORT   frps control port
EOF
}

if [[ ${1:-} == "-h" || ${1:-} == "--help" ]]; then
  usage
  exit 0
fi

if ! command -v "$KUBECTL_BIN" >/dev/null 2>&1; then
  echo "kubectl not found: $KUBECTL_BIN" >&2
  exit 1
fi

KUBECTL_RUNNER=("$KUBECTL_BIN")
if ! "$KUBECTL_BIN" --kubeconfig "$KUBECONFIG_SOURCE" config view --raw --minify >/dev/null 2>&1; then
  if command -v sudo >/dev/null 2>&1; then
    KUBECTL_RUNNER=(sudo env KUBECONFIG="$KUBECONFIG_SOURCE" "$KUBECTL_BIN")
  else
    echo "kubectl cannot read $KUBECONFIG_SOURCE and sudo is unavailable" >&2
    exit 1
  fi
else
  KUBECTL_RUNNER=("$KUBECTL_BIN" --kubeconfig "$KUBECONFIG_SOURCE")
fi

if [[ -z "$FRPS_SHARED_TOKEN" ]]; then
  echo "FRPS_SHARED_TOKEN is required" >&2
  usage >&2
  exit 1
fi

tmp_config="$(mktemp)"
trap 'rm -f "$tmp_config"' EXIT

sed \
  -e "s/frps.dlx.studio/$FRPS_SERVER_ADDR/g" \
  -e "s/serverPort = 7000/serverPort = $FRPS_SERVER_PORT/g" \
  "$ROOT_DIR/deploy/k3s/frpc/configmap.yaml" >"$tmp_config"

echo "Applying frpc namespace..."
"${KUBECTL_RUNNER[@]}" apply -f "$ROOT_DIR/deploy/k3s/frpc/namespace.yaml"

echo "Applying frpc token secret..."
"${KUBECTL_RUNNER[@]}" -n "$FRPC_NAMESPACE" create secret generic frpc-token \
  --from-literal=token="$FRPS_SHARED_TOKEN" \
  --dry-run=client -o yaml | "${KUBECTL_RUNNER[@]}" apply -f -

echo "Applying frpc configmap..."
"${KUBECTL_RUNNER[@]}" apply -f "$tmp_config"

echo "Applying frpc deployment..."
"${KUBECTL_RUNNER[@]}" apply -f "$ROOT_DIR/deploy/k3s/frpc/deployment.yaml"

echo "Restarting frpc deployment..."
"${KUBECTL_RUNNER[@]}" rollout restart deployment/frpc -n "$FRPC_NAMESPACE"

echo "Waiting for frpc rollout..."
"${KUBECTL_RUNNER[@]}" -n "$FRPC_NAMESPACE" rollout status deployment/frpc --timeout=120s
