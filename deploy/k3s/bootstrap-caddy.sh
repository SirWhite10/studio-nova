#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
KUBECTL_BIN="${KUBECTL_BIN:-kubectl}"
KUBECONFIG_SOURCE="${KUBECONFIG_SOURCE:-/etc/rancher/k3s/k3s.yaml}"

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

"${KUBECTL_RUNNER[@]}" apply -f "$ROOT_DIR/deploy/k3s/edge-namespace.yaml"
"${KUBECTL_RUNNER[@]}" apply -f "$ROOT_DIR/deploy/k3s/caddy/configmap.yaml"
"${KUBECTL_RUNNER[@]}" apply -f "$ROOT_DIR/deploy/k3s/caddy/service.yaml"
"${KUBECTL_RUNNER[@]}" apply -f "$ROOT_DIR/deploy/k3s/caddy/deployment.yaml"
"${KUBECTL_RUNNER[@]}" -n nova-edge rollout restart deployment/caddy
"${KUBECTL_RUNNER[@]}" -n nova-edge rollout status deployment/caddy --timeout=120s
