#!/usr/bin/env bash
set -euo pipefail

target_path="${1:-.}"
exclude_globs=(
  --glob '!node_modules/**'
  --glob '!.svelte-kit/**'
  --glob '!dist/**'
  --glob '!build/**'
  --glob '!.git/**'
)

if ! command -v rg >/dev/null 2>&1; then
  echo "rg (ripgrep) is required." >&2
  exit 2
fi

failures=0

scan_fail() {
  local label="$1"
  local pattern="$2"
  local suggestion="$3"
  local tmp_file
  tmp_file="$(mktemp)"

  if rg -n --hidden "${exclude_globs[@]}" -e "$pattern" "$target_path" >"$tmp_file"; then
    echo "[FAIL] $label"
    cat "$tmp_file"
    echo "suggestion: $suggestion"
    echo
    failures=1
  else
    echo "[OK] $label"
  fi

  rm -f "$tmp_file"
}

scan_warn() {
  local label="$1"
  local pattern="$2"
  local note="$3"
  local tmp_file
  tmp_file="$(mktemp)"

  if rg -n --hidden "${exclude_globs[@]}" -e "$pattern" "$target_path" >"$tmp_file"; then
    echo "[WARN] $label"
    cat "$tmp_file"
    echo "note: $note"
    echo
  else
    echo "[OK] $label"
  fi

  rm -f "$tmp_file"
}

echo "Scanning for common SurrealDB API mismatches in: $target_path"
echo

scan_fail \
  "legacy connect auth option ('auth')" \
  '\bauth\s*:\s*\{' \
  "Use 'authentication: { username, password }' in connect options."

scan_fail \
  "legacy create(table, data) usage" \
  '\.create\(\s*[^,\n]+\s*,\s*' \
  "Use create(table).content(data)."

scan_warn \
  "possible direct merge call (verify update(...).merge(...))" \
  '\b[A-Za-z_$][A-Za-z0-9_$]*\.merge\(' \
  "Ensure merge is called from db.update(recordId).merge(data), not as a direct Surreal instance method."

if [[ "$failures" -ne 0 ]]; then
  echo "Mismatch scan failed."
  exit 1
fi

echo "Mismatch scan passed."
