# Schema Operations Contract

## Ownership

`database/schema/**/*.surql` is the sole authoritative desired state. Application services may query schema metadata and declare a minimum compatible schema version, but they may not apply DDL during ordinary startup or request handling.

## Environments

| Environment           | Allowed operation                             | Safety rule                                                               |
| --------------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| Disposable local/test | validate, test, sync, seed                    | Database may be recreated                                                 |
| Shared development    | rollout baseline/plan/start/complete          | Backup and reviewed manifest required                                     |
| Production            | rollout baseline/plan/start/complete/rollback | Explicit operator checkpoint, backup, and post-step verification required |

## Required Commands

- `catalog`: read and normalize live table/field/index definitions without mutation.
- `validate`: parse every schema and seed file.
- `check`: compare required definitions and schema compatibility metadata.
- `test`: run isolated schema metadata, behavior, and tenant-isolation tests.
- `baseline`: capture existing database snapshots without mutation.
- `plan`: generate a reviewed rollout manifest.
- `start`: apply additive/expand steps only.
- `complete`: apply contract steps only after application cutover approval.
- `backfill`: idempotently create new records from legacy sources and report counts.

## Startup Compatibility

Each service declares a required schema release key. Startup behavior:

1. Connect with least-privilege application credentials.
2. Read schema compatibility metadata.
3. If compatible, start normally.
4. If behind, report an unhealthy status and refuse new writes requiring absent definitions.
5. Never attempt to repair the schema automatically.

## Production Gates

Before `start`:

- A current data export exists and is readable.
- Repository definitions include every live schema object.
- Schema tests pass against a disposable database.
- The rollout contains no unreviewed destructive start-phase operation.

Before `complete`:

- New application versions are deployed.
- Backfill count and relationship checks pass.
- Legacy and new reads agree for the observation window.
- Rollback has been tested.
- An operator records an explicit timestamped approval.
