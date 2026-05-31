#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
KUBECTL_BIN="${KUBECTL_BIN:-kubectl}"
KUBECONFIG_SOURCE="${KUBECONFIG_SOURCE:-/etc/rancher/k3s/k3s.yaml}"
NAMESPACE="${NAMESPACE:-nova-cloud}"
SURREALDB_USERNAME="${SURREALDB_USERNAME:-root}"
SURREALDB_PASSWORD="${SURREALDB_PASSWORD:-root}"
SURREALDB_NAMESPACE_NAME="${SURREALDB_NAMESPACE_NAME:-main}"
SURREALDB_DATABASE_NAME="${SURREALDB_DATABASE_NAME:-main}"
DEPLOYMENT_MODE="${DEPLOYMENT_MODE:-clusterip}"
SEED_FROM_HOST="${SEED_FROM_HOST:-1}"
STOP_LOCAL_SERVICE="${STOP_LOCAL_SERVICE:-0}"
DISABLE_LOCAL_SERVICE="${DISABLE_LOCAL_SERVICE:-0}"
LOCAL_SERVICE_NAME="${LOCAL_SERVICE_NAME:-nova-surrealdb.service}"

usage() {
  cat <<'EOF'
Usage: bootstrap-surrealdb.sh [options]

Bootstraps Nova SurrealDB into k3s.

Options:
  --mode MODE              clusterip (default) or hostport
  --no-seed                Skip copying the current host SurrealDB data into the PVC
  --stop-local-service     Stop the local systemd SurrealDB service before seeding/deploying
  --disable-local-service  Disable the local systemd SurrealDB service after stopping it
  --help                   Show this help text

Environment overrides:
  SURREALDB_USERNAME
  SURREALDB_PASSWORD
  SURREALDB_NAMESPACE_NAME
  SURREALDB_DATABASE_NAME
  KUBECTL_BIN
  KUBECONFIG_SOURCE
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --mode)
      DEPLOYMENT_MODE="$2"
      shift 2
      ;;
    --no-seed)
      SEED_FROM_HOST=0
      shift
      ;;
    --stop-local-service)
      STOP_LOCAL_SERVICE=1
      shift
      ;;
    --disable-local-service)
      STOP_LOCAL_SERVICE=1
      DISABLE_LOCAL_SERVICE=1
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

case "$DEPLOYMENT_MODE" in
  clusterip|hostport) ;;
  *)
    echo "Invalid deployment mode: $DEPLOYMENT_MODE" >&2
    exit 1
    ;;
esac

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

if [ "$STOP_LOCAL_SERVICE" -eq 1 ]; then
  sudo systemctl stop "$LOCAL_SERVICE_NAME" >/dev/null 2>&1 || true
  if [ "$DISABLE_LOCAL_SERVICE" -eq 1 ]; then
    sudo systemctl disable "$LOCAL_SERVICE_NAME" >/dev/null 2>&1 || true
  fi
fi

"${KUBECTL_RUNNER[@]}" apply -f "$ROOT_DIR/deploy/k3s/nova-cloud-namespace.yaml"
"${KUBECTL_RUNNER[@]}" -n "$NAMESPACE" create secret generic nova-surrealdb-app-env \
  --from-literal=SURREALDB_URL="http://nova-surrealdb.${NAMESPACE}.svc.cluster.local:8000/rpc" \
  --from-literal=SURREALDB_NAMESPACE="$SURREALDB_NAMESPACE_NAME" \
  --from-literal=SURREALDB_DATABASE="$SURREALDB_DATABASE_NAME" \
  --from-literal=SURREALDB_USERNAME="$SURREALDB_USERNAME" \
  --from-literal=SURREALDB_PASSWORD="$SURREALDB_PASSWORD" \
  --dry-run=client -o yaml | "${KUBECTL_RUNNER[@]}" apply -f -
"${KUBECTL_RUNNER[@]}" apply -f "$ROOT_DIR/deploy/k3s/surrealdb/pvc.yaml"
"${KUBECTL_RUNNER[@]}" apply -f "$ROOT_DIR/deploy/k3s/surrealdb/service.yaml"

if [ "$SEED_FROM_HOST" -eq 1 ]; then
  "${KUBECTL_RUNNER[@]}" -n "$NAMESPACE" delete deployment nova-surrealdb --ignore-not-found >/dev/null 2>&1 || true
  "${KUBECTL_RUNNER[@]}" -n "$NAMESPACE" delete job nova-surrealdb-seed --ignore-not-found >/dev/null 2>&1 || true
  "${KUBECTL_RUNNER[@]}" apply -f "$ROOT_DIR/deploy/k3s/surrealdb/seed-job.yaml"
  "${KUBECTL_RUNNER[@]}" -n "$NAMESPACE" wait --for=condition=complete job/nova-surrealdb-seed --timeout=180s
fi

if [ "$DEPLOYMENT_MODE" = "hostport" ]; then
  "${KUBECTL_RUNNER[@]}" apply -f "$ROOT_DIR/deploy/k3s/surrealdb/deployment-hostport.yaml"
else
  "${KUBECTL_RUNNER[@]}" apply -f "$ROOT_DIR/deploy/k3s/surrealdb/deployment.yaml"
fi

"${KUBECTL_RUNNER[@]}" -n "$NAMESPACE" rollout status deployment/nova-surrealdb --timeout=180s

if [ "$DEPLOYMENT_MODE" = "hostport" ]; then
  curl -sf http://127.0.0.1:8000/health >/dev/null
  echo "Verified host access on http://127.0.0.1:8000"
fi

echo "Nova SurrealDB deployed in namespace ${NAMESPACE} using mode ${DEPLOYMENT_MODE}."
