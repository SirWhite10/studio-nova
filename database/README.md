# Constellation Database

This directory is the authoritative SurrealDB schema for the complete Studio Nova installation. It follows the official SurrealKit project layout and is shared by Nova Cloud, Nova Runtime Control, Nova Domain Control, and Nova Edge.

## Safety Model

- Use `surrealkit sync` only for disposable local/test databases. Sync can prune unmanaged definitions.
- Use `surrealkit rollout baseline`, `plan`, `start`, and `rollback` for shared databases.
- Never run `rollout complete` until the compatibility observation window has passed and an operator explicitly approves legacy removal.
- Application services perform read-only schema compatibility checks. They do not apply DDL during startup or page requests.
- Keep credentials in environment variables or an untracked `.env` file.

## Connection Variables

```bash
export SURREALDB_HOST=http://127.0.0.1:8000
export SURREALDB_NAMESPACE=main
export SURREALDB_NAME=main
export SURREALDB_USER=root
export SURREALDB_PASSWORD=change-me
export SURREALDB_AUTH_LEVEL=root
```

Nova Cloud currently calls the corresponding values `SURREALDB_URL`, `SURREALDB_DATABASE`, and `SURREALDB_USERNAME`. `tools/database-admin` accepts both naming schemes.

## Local Workflow

```bash
surrealkit sync --user "$SURREALDB_USER" --pass "$SURREALDB_PASSWORD"
surrealkit seed --user "$SURREALDB_USER" --pass "$SURREALDB_PASSWORD"
surrealkit test
vp run database-admin#compatibility
```

## Shared/Production Workflow

```bash
vp run database-admin#catalog -- --environment production
vp run database-admin#backup -- --environment production
vp run database-admin#compare-live -- --environment production
surrealkit rollout baseline --user "$SURREALDB_USER" --pass "$SURREALDB_PASSWORD"
surrealkit rollout plan --name constellation_expand
```

Review the generated rollout manifest before running `rollout start`. The repository's first rollout must be additive only.

## Layout

- `schema/`: desired table, field, and index definitions.
- `rollouts/`: reviewed SurrealKit rollout manifests and operator notes.
- `snapshots/`: baseline/catalog snapshots produced by SurrealKit.
- `seed/`: idempotent non-secret reference records.
- `tests/`: isolated SurrealKit schema test suites.
- `types/`: generated schema documents.
