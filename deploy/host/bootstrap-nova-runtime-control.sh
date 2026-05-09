#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
KUBECTL_BIN="${KUBECTL_BIN:-kubectl}"
KUBECONFIG_SOURCE="${KUBECONFIG_SOURCE:-/etc/rancher/k3s/k3s.yaml}"
TARGET_HOME="${TARGET_HOME:-/home/nova}"
TARGET_USER="${TARGET_USER:-nova}"
TARGET_KUBECONFIG="${TARGET_KUBECONFIG:-$TARGET_HOME/.kube/config}"
SYSTEMD_UNIT_PATH="${SYSTEMD_UNIT_PATH:-/etc/systemd/system/nova-runtime-control.service}"
SA_NAMESPACE="${SA_NAMESPACE:-nova-runtime-control}"
SA_NAME="${SA_NAME:-nova-runtime-control}"
SA_TOKEN_DURATION="${SA_TOKEN_DURATION:-8760h}"
NOVA_RUNTIME_CONTROL_HOST="${NOVA_RUNTIME_CONTROL_HOST:-127.0.0.1}"
NOVA_RUNTIME_CONTROL_PORT="${NOVA_RUNTIME_CONTROL_PORT:-8787}"
NOVA_RUNTIME_CONTROL_TOKEN="${NOVA_RUNTIME_CONTROL_TOKEN:-}"
NOVA_RUNTIME_KUBECTL="${NOVA_RUNTIME_KUBECTL:-$KUBECTL_BIN}"
NOVA_RUNTIME_NAMESPACE_PREFIX="${NOVA_RUNTIME_NAMESPACE_PREFIX:-nova-runtime}"
NOVA_RUNTIME_IMAGE="${NOVA_RUNTIME_IMAGE:-node:24-alpine}"
NOVA_RUNTIME_AGENT_TOKEN="${NOVA_RUNTIME_AGENT_TOKEN:-}"

usage() {
  cat <<EOF
Usage: $(basename "$0")

Bootstrap the ServiceAccount kubeconfig, host env file, and systemd unit for nova-runtime-control.

Environment overrides:
  KUBECTL_BIN                  kubectl binary to use
  TARGET_HOME                  home directory for the nova user
  TARGET_USER                  user that owns the service
  TARGET_KUBECONFIG            kubeconfig path for the service
  SA_NAMESPACE                 ServiceAccount namespace
  SA_NAME                      ServiceAccount name
  SA_TOKEN_DURATION            token lifetime for kubectl create token
  NOVA_RUNTIME_CONTROL_HOST    host bind address for the app
  NOVA_RUNTIME_CONTROL_PORT    port for the app
  NOVA_RUNTIME_CONTROL_TOKEN   mutating endpoint bearer token
  NOVA_RUNTIME_AGENT_TOKEN     pod-internal runtime agent token
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

rand_token() {
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

escape_env_value() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

if [[ -z "$NOVA_RUNTIME_CONTROL_TOKEN" ]]; then
  NOVA_RUNTIME_CONTROL_TOKEN="$(rand_token)"
fi

if [[ -z "$NOVA_RUNTIME_AGENT_TOKEN" ]]; then
  NOVA_RUNTIME_AGENT_TOKEN="$(rand_token)"
fi

echo "Applying nova-runtime-control RBAC..."
"${KUBECTL_RUNNER[@]}" apply -f "$ROOT_DIR/deploy/k3s/nova-runtime-control-rbac.yaml"

echo "Fetching ServiceAccount token..."
SERVICE_ACCOUNT_TOKEN="$("${KUBECTL_RUNNER[@]}" -n "$SA_NAMESPACE" create token "$SA_NAME" --duration="$SA_TOKEN_DURATION")"

CLUSTER_SERVER="$("${KUBECTL_RUNNER[@]}" config view --raw --minify -o jsonpath='{.clusters[0].cluster.server}')"
CLUSTER_CA="$("${KUBECTL_RUNNER[@]}" config view --raw --minify --flatten -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')"

if [[ -z "$CLUSTER_SERVER" || -z "$CLUSTER_CA" || -z "$SERVICE_ACCOUNT_TOKEN" ]]; then
  echo "Failed to read cluster server, CA, or ServiceAccount token" >&2
  exit 1
fi

mkdir -p "$TARGET_HOME/.kube"
cat >"$TARGET_KUBECONFIG" <<EOF
apiVersion: v1
kind: Config
clusters:
  - name: k3s
    cluster:
      server: $CLUSTER_SERVER
      certificate-authority-data: $CLUSTER_CA
users:
  - name: nova-runtime-control
    user:
      token: $SERVICE_ACCOUNT_TOKEN
contexts:
  - name: nova-runtime-control@k3s
    context:
      cluster: k3s
      namespace: $SA_NAMESPACE
      user: nova-runtime-control
current-context: nova-runtime-control@k3s
EOF
chmod 600 "$TARGET_KUBECONFIG"
if [[ $EUID -eq 0 ]]; then
  chown "$TARGET_USER:$TARGET_USER" "$TARGET_KUBECONFIG"
else
  sudo chown "$TARGET_USER:$TARGET_USER" "$TARGET_KUBECONFIG" 2>/dev/null || true
fi

cat >"$ROOT_DIR/apps/nova-runtime-control/.env.local" <<EOF
NOVA_RUNTIME_CONTROL_HOST=$NOVA_RUNTIME_CONTROL_HOST
NOVA_RUNTIME_CONTROL_PORT=$NOVA_RUNTIME_CONTROL_PORT
NOVA_RUNTIME_CONTROL_TOKEN=$(escape_env_value "$NOVA_RUNTIME_CONTROL_TOKEN")
NOVA_RUNTIME_KUBECTL=$NOVA_RUNTIME_KUBECTL
NOVA_RUNTIME_NAMESPACE_PREFIX=$NOVA_RUNTIME_NAMESPACE_PREFIX
NOVA_RUNTIME_IMAGE=$NOVA_RUNTIME_IMAGE
NOVA_RUNTIME_AGENT_TOKEN=$(escape_env_value "$NOVA_RUNTIME_AGENT_TOKEN")
EOF
chmod 0644 "$ROOT_DIR/apps/nova-runtime-control/.env.local"
if [[ $EUID -eq 0 ]]; then
  chown "$TARGET_USER:$TARGET_USER" "$ROOT_DIR/apps/nova-runtime-control/.env.local"
else
  sudo chown "$TARGET_USER:$TARGET_USER" "$ROOT_DIR/apps/nova-runtime-control/.env.local" 2>/dev/null || true
fi

if [[ $EUID -eq 0 ]]; then
  install -m 0644 "$ROOT_DIR/deploy/host/nova-runtime-control.service" "$SYSTEMD_UNIT_PATH"
  systemctl daemon-reload
  systemctl enable --now nova-runtime-control
elif command -v sudo >/dev/null 2>&1; then
  sudo install -m 0644 "$ROOT_DIR/deploy/host/nova-runtime-control.service" "$SYSTEMD_UNIT_PATH"
  sudo systemctl daemon-reload
  sudo systemctl enable --now nova-runtime-control
else
  echo "sudo is required to install and start the systemd unit" >&2
  exit 1
fi

echo
echo "nova-runtime-control token: $NOVA_RUNTIME_CONTROL_TOKEN"
echo "nova-runtime-agent token:  $NOVA_RUNTIME_AGENT_TOKEN"
echo "kubeconfig written to:      $TARGET_KUBECONFIG"
echo "systemd unit installed at:   $SYSTEMD_UNIT_PATH"
