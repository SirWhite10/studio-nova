#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
KUBECTL_BIN="${KUBECTL_BIN:-kubectl}"
KUBECONFIG_SOURCE="${KUBECONFIG_SOURCE:-/etc/rancher/k3s/k3s.yaml}"
NOVA_DOMAIN_CONTROL_STORE="${NOVA_DOMAIN_CONTROL_STORE:-memory}"
NOVA_DOMAIN_CONTROL_TOKEN="${NOVA_DOMAIN_CONTROL_TOKEN:-}"
NOVA_DOMAIN_CONTROL_FRP_TOKEN="${NOVA_DOMAIN_CONTROL_FRP_TOKEN:-}"
NOVA_CADDY_ADMIN_URL="${NOVA_CADDY_ADMIN_URL:-http://caddy.nova-edge.svc.cluster.local:2019}"
NOVA_DOMAIN_CONTROL_SUBDOMAIN_HOST="${NOVA_DOMAIN_CONTROL_SUBDOMAIN_HOST:-dlx.studio}"
NOVA_DOMAIN_CONTROL_VERIFICATION_PREFIX="${NOVA_DOMAIN_CONTROL_VERIFICATION_PREFIX:-_nova-domain}"
SURREALDB_URL="${SURREALDB_URL:-memory}"
SURREALDB_NAMESPACE="${SURREALDB_NAMESPACE:-main}"
SURREALDB_DATABASE="${SURREALDB_DATABASE:-main}"
SURREALDB_USERNAME="${SURREALDB_USERNAME:-root}"
SURREALDB_PASSWORD="${SURREALDB_PASSWORD:-root}"

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

if [[ -z "$NOVA_DOMAIN_CONTROL_TOKEN" ]]; then
  NOVA_DOMAIN_CONTROL_TOKEN="$(rand_token)"
fi
if [[ -z "$NOVA_DOMAIN_CONTROL_FRP_TOKEN" ]]; then
  NOVA_DOMAIN_CONTROL_FRP_TOKEN="$(rand_token)"
fi

"${KUBECTL_RUNNER[@]}" apply -f "$ROOT_DIR/deploy/k3s/domain-control/namespace.yaml"
"${KUBECTL_RUNNER[@]}" -n nova-domain create secret generic nova-domain-control-env \
  --from-literal=NOVA_DOMAIN_CONTROL_STORE="$NOVA_DOMAIN_CONTROL_STORE" \
  --from-literal=NOVA_DOMAIN_CONTROL_HOST="0.0.0.0" \
  --from-literal=NOVA_DOMAIN_CONTROL_PORT="8790" \
  --from-literal=NOVA_DOMAIN_CONTROL_TOKEN="$NOVA_DOMAIN_CONTROL_TOKEN" \
  --from-literal=NOVA_DOMAIN_CONTROL_FRP_TOKEN="$NOVA_DOMAIN_CONTROL_FRP_TOKEN" \
  --from-literal=NOVA_CADDY_ADMIN_URL="$NOVA_CADDY_ADMIN_URL" \
  --from-literal=NOVA_DOMAIN_CONTROL_SUBDOMAIN_HOST="$NOVA_DOMAIN_CONTROL_SUBDOMAIN_HOST" \
  --from-literal=NOVA_DOMAIN_CONTROL_VERIFICATION_PREFIX="$NOVA_DOMAIN_CONTROL_VERIFICATION_PREFIX" \
  --from-literal=SURREALDB_URL="$SURREALDB_URL" \
  --from-literal=SURREALDB_NAMESPACE="$SURREALDB_NAMESPACE" \
  --from-literal=SURREALDB_DATABASE="$SURREALDB_DATABASE" \
  --from-literal=SURREALDB_USERNAME="$SURREALDB_USERNAME" \
  --from-literal=SURREALDB_PASSWORD="$SURREALDB_PASSWORD" \
  --dry-run=client -o yaml | "${KUBECTL_RUNNER[@]}" apply -f -
"${KUBECTL_RUNNER[@]}" apply -f "$ROOT_DIR/deploy/k3s/domain-control/service.yaml"
"${KUBECTL_RUNNER[@]}" apply -f "$ROOT_DIR/deploy/k3s/domain-control/deployment.yaml"
"${KUBECTL_RUNNER[@]}" -n nova-domain rollout restart deployment/nova-domain-control
"${KUBECTL_RUNNER[@]}" -n nova-domain rollout status deployment/nova-domain-control --timeout=120s

echo "nova-domain-control token: $NOVA_DOMAIN_CONTROL_TOKEN"
echo "nova-domain-control frp token: $NOVA_DOMAIN_CONTROL_FRP_TOKEN"
