#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ENV_FILE="$ROOT_DIR/.env"

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

if [[ -z "${FRPS_SHARED_TOKEN:-}" ]]; then
  FRPS_SHARED_TOKEN="$(generate_token)"
fi

FRPS_SERVER_ADDR="${FRPS_SERVER_ADDR:-frps.dlx.studio}"
FRPS_SERVER_PORT="${FRPS_SERVER_PORT:-7000}"

cat >"$ENV_FILE" <<EOF
FRPS_SHARED_TOKEN=$FRPS_SHARED_TOKEN
FRPS_SERVER_ADDR=$FRPS_SERVER_ADDR
FRPS_SERVER_PORT=$FRPS_SERVER_PORT
EOF
chmod 600 "$ENV_FILE"

export FRPS_SHARED_TOKEN
export FRPS_SERVER_ADDR
export FRPS_SERVER_PORT

"$ROOT_DIR/host/bootstrap-nova-runtime-control.sh"
"$ROOT_DIR/k3s/bootstrap-frpc.sh"
