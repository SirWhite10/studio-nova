#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="$ROOT/apps/nova-cloud/.env.local"
TMP_ENV="$(mktemp)"
cleanup() {
  rm -f "$TMP_ENV"
}
trap cleanup EXIT

KUBECTL="sudo k3s kubectl"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Create it first or apply deploy/k3s/public-apps/nova-cloud-web-env.example.yaml manually." >&2
  exit 1
fi

echo "[1/4] Verifying build artifacts"
for required in \
  "$ROOT/apps/website/.svelte-kit/output/server/index.js" \
  "$ROOT/packages/canvas/.svelte-kit/output/server/index.js" \
  "$ROOT/apps/nova-cloud/build/index.js"
do
  if [[ ! -f "$required" ]]; then
    echo "Missing build artifact: $required" >&2
    echo "Rebuild the apps first, then rerun this bootstrap." >&2
    exit 1
  fi
done

echo "Using existing host build artifacts."

echo "[2/4] Rendering nova-cloud-web-env secret from .env.local with k3s overrides"
grep -Ev '^(NOVA_DOMAIN_CONTROL_URL|NOVA_RUNTIME_CONTROL_URL|SURREALDB_URL)=' "$ENV_FILE" > "$TMP_ENV"
cat >> "$TMP_ENV" <<'EOF'
NOVA_DOMAIN_CONTROL_URL=http://nova-domain-control.nova-domain.svc.cluster.local:8790
NOVA_RUNTIME_CONTROL_URL=http://127.0.0.1:8787
SURREALDB_URL=http://nova-surrealdb.nova-cloud.svc.cluster.local:8000/rpc
EOF
$KUBECTL -n nova-cloud create secret generic nova-cloud-web-env \
  --from-env-file="$TMP_ENV" \
  --dry-run=client -o yaml | $KUBECTL apply -f -

echo "[3/4] Applying k3s manifests"
$KUBECTL apply -f "$ROOT/deploy/k3s/public-apps/website-service.yaml"
$KUBECTL apply -f "$ROOT/deploy/k3s/public-apps/canvas-service.yaml"
$KUBECTL apply -f "$ROOT/deploy/k3s/public-apps/nova-cloud-service.yaml"
$KUBECTL apply -f "$ROOT/deploy/k3s/public-apps/website-deployment.yaml"
$KUBECTL apply -f "$ROOT/deploy/k3s/public-apps/canvas-deployment.yaml"
$KUBECTL apply -f "$ROOT/deploy/k3s/public-apps/nova-cloud-deployment.yaml"

echo "[4/4] Waiting for rollouts"
$KUBECTL -n nova-cloud rollout status deploy/nova-website --timeout=180s
$KUBECTL -n nova-cloud rollout status deploy/nova-canvas --timeout=180s
$KUBECTL -n nova-cloud rollout status deploy/nova-cloud-web --timeout=240s

echo
echo "Public apps are deployed on:"
echo "  - 10001 landing page"
echo "  - 10002 canvas"
echo "  - 10003 nova-cloud"
echo
echo "Quick checks:"
echo "  curl -I http://127.0.0.1:10001"
echo "  curl -I http://127.0.0.1:10002"
echo "  curl -I http://127.0.0.1:10003"
