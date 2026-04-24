#!/usr/bin/env bash
set -euo pipefail

MIN_VERSION="2.1.0"

choose_bin() {
  if [[ -n "${SURREAL_BIN:-}" && -x "${SURREAL_BIN}" ]]; then
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
  --bind 0.0.0.0:8000 \
  --username root \
  --password root \
  --no-banner \
  surrealkv://./surreal/data
