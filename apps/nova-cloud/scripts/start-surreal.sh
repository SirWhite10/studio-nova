#!/usr/bin/env bash
set -euo pipefail

MIN_VERSION="2.1.0"
DATA_DIR="${SURREAL_DATA_DIR:-./surreal/data}"
BIND_ADDR="${SURREAL_BIND_ADDR:-0.0.0.0:8000}"
SURREAL_USERNAME="${SURREAL_USERNAME:-root}"
SURREAL_PASSWORD="${SURREAL_PASSWORD:-root}"

choose_bin() {
  if [[ -n "${SURREAL_BIN:-}" && -x "${SURREAL_BIN:-}" ]]; then
    echo "${SURREAL_BIN}"
    return
  fi

  if [[ -x "${HOME}/.surrealdb/surreal" ]]; then
    echo "${HOME}/.surrealdb/surreal"
    return
  fi

  if [[ -x "/tmp/surreal" ]]; then
    echo "/tmp/surreal"
    return
  fi

  command -v surreal
}

version_ge() {
  local current="$1"
  local minimum="$2"
  [[ "$(printf '%s\n%s\n' "$minimum" "$current" | sort -V | head -n1)" == "$minimum" ]]
}

BIN="$(choose_bin)"
VERSION="$("$BIN" version | awk '{print $1}')"

if ! version_ge "$VERSION" "$MIN_VERSION"; then
  echo "SurrealDB binary $BIN is version $VERSION, but Nova requires >= $MIN_VERSION." >&2
  echo "Set SURREAL_BIN to a newer binary or install a newer surreal release." >&2
  exit 1
fi

exec "$BIN" start \
  --bind "$BIND_ADDR" \
  --username "$SURREAL_USERNAME" \
  --password "$SURREAL_PASSWORD" \
  --no-banner \
  "surrealkv://${DATA_DIR}"
