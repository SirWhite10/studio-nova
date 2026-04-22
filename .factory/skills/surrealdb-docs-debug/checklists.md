# SurrealDB Docs + Debug Checklist

## Required before app implementation

- [ ] Canonical docs reviewed from `connecting-to-surrealdb`.
- [ ] Installed SDK version and local `surrealdb.d.ts` path confirmed.
- [ ] `surreal_signature_lookup.py` run for `ConnectOptions`, `create`, `update`, `merge`.
- [ ] TypeScript tests created in target app `tests/`.
- [ ] `tests/surreal.create-table.test.ts` passed first.
- [ ] Remaining SurrealDB tests passed.
- [ ] Mismatch scan reports no failing patterns.
- [ ] Type/app check command passed.

## Blockers

- Any TypeScript error.
- Any SurrealDB API-shape mismatch.
- Create-table preflight test failure.
