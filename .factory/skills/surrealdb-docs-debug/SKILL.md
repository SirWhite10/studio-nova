---
name: surrealdb-docs-debug
description: Uses canonical SurrealDB JavaScript SDK docs and local SDK typings to run test-first integration checks, detect API mismatches, and block app implementation until TypeScript and SurrealDB checks pass.
---

# SurrealDB Docs + Debug (Test-First)

## Primary reference

- `https://surrealdb.com/docs/sdk/javascript/concepts/connecting-to-surrealdb`

## When to use this skill

- SurrealDB integration is being added or fixed.
- Errors suggest SDK API mismatch (`auth`, `create(table, data)`, `db.merge(...)` assumptions).
- You need a test-first gate before writing app code.

## Inputs

- `project_root`
- `target_app_path`
- `tests_dir` (default: `tests`)
- `docs_entry_url` (default: primary reference URL)
- `validation_command_preference` (`auto|vp|bun|npm`)
- `gate_mode` (`type_or_surreal_errors|strict`)

## Required workflow (must follow order)

1. Read the canonical docs page first (and adjacent API pages if needed).
2. Resolve installed SDK signatures from local `surrealdb.d.ts`.
3. Create TypeScript preflight tests in the target app `tests/` directory.
4. Run mismatch scan against app/test code.
5. Run tests in strict order:
   - `tests/surreal.create-table.test.ts` first (mandatory gate)
   - then `tests/surreal.connect-authentication.test.ts`
   - then `tests/surreal.crud-patterns.test.ts`
6. Run type/app checks.
7. Only after all gates pass, proceed with app implementation.

## Hard gate rules

- Do not modify app implementation files before preflight tests pass.
- Block implementation on:
  - TypeScript errors
  - SurrealDB API-shape errors
- If `surreal.create-table.test.ts` fails, stop immediately and fix test/setup first.

## Helpers in this skill

- `scripts/surreal_signature_lookup.py`
  - Extracts local SDK signatures for symbols/methods.
- `scripts/surreal_mismatch_scan.sh`
  - Detects common mismatch patterns.
- `scripts/surreal_ts_preflight.sh`
  - Enforces tests-first execution and gate behavior.

## Typical usage

```bash
.factory/skills/surrealdb-docs-debug/scripts/surreal_signature_lookup.py ConnectOptions create update merge
.factory/skills/surrealdb-docs-debug/scripts/surreal_mismatch_scan.sh apps/surreal-test
.factory/skills/surrealdb-docs-debug/scripts/surreal_ts_preflight.sh apps/surreal-test tests
```

## Expected outcomes

- Version-correct SurrealDB usage (`authentication`, `create().content(...)`, `update(id).merge(...)`).
- Test-first proof captured in target app `tests/`.
- Clear pass/fail gate before app implementation.
