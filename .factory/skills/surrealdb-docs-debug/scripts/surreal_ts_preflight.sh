#!/usr/bin/env bash
set -euo pipefail

target_app_path="${1:-.}"
tests_dir="${2:-tests}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

required_tests=(
  "$tests_dir/surreal.create-table.test.ts"
  "$tests_dir/surreal.connect-authentication.test.ts"
  "$tests_dir/surreal.crud-patterns.test.ts"
)

for test_file in "${required_tests[@]}"; do
  if [[ ! -f "$target_app_path/$test_file" ]]; then
    echo "Missing required test file: $target_app_path/$test_file" >&2
    exit 2
  fi
done

if [[ -n "${TEST_RUNNER_CMD:-}" ]]; then
  read -r -a test_runner <<<"${TEST_RUNNER_CMD}"
elif command -v vp >/dev/null 2>&1; then
  test_runner=(vp test --run)
elif command -v bun >/dev/null 2>&1; then
  test_runner=(bun test)
else
  test_runner=(npm test --)
fi

if [[ -n "${TYPECHECK_CMD:-}" ]]; then
  read -r -a typecheck_runner <<<"${TYPECHECK_CMD}"
elif command -v vp >/dev/null 2>&1; then
  typecheck_runner=(vp check)
elif command -v bun >/dev/null 2>&1; then
  typecheck_runner=(bun run check)
else
  typecheck_runner=(npm run check)
fi

echo "Step 1/3: scan for known SurrealDB API mismatches"
"$script_dir/surreal_mismatch_scan.sh" "$target_app_path"

echo "Step 2/3: run mandatory create-table test first"
(
  cd "$target_app_path"
  "${test_runner[@]}" "$tests_dir/surreal.create-table.test.ts"
)

echo "Step 2b/3: run remaining SurrealDB tests"
(
  cd "$target_app_path"
  "${test_runner[@]}" "$tests_dir/surreal.connect-authentication.test.ts"
  "${test_runner[@]}" "$tests_dir/surreal.crud-patterns.test.ts"
)

echo "Step 3/3: run type/app checks"
(
  cd "$target_app_path"
  "${typecheck_runner[@]}"
)

echo "Preflight passed. App implementation may proceed."
