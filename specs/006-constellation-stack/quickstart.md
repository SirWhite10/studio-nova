# Quickstart: Constellation Vertical Slice

Run this sequence against a disposable SurrealDB database before any shared-environment operation.
The automated smoke refuses an environment named `production`, `prod`, or `shared` and also
requires `--confirm-disposable`.

## 1. Repository Validation

```bash
vp install
vp check
vp test
vp run -r check
vp run -r test
```

Nova Edge is validated separately from `apps/nova-edge`:

```bash
rustfmt --edition 2024 --check \
  crates/edge-store/src/store.rs \
  crates/edge-store/src/surreal_store.rs \
  crates/edge-api/src/handlers/health.rs
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

If clippy fails only on known pre-existing warnings, record every warning category and run ordinary
workspace tests; do not silently rewrite unrelated Rust modules.

## 2. Disposable Database

Start SurrealDB on a non-production namespace/database and export both the application and
SurrealKit variable names:

```bash
export SURREALDB_HOST=http://127.0.0.1:18005
export SURREALDB_URL=ws://127.0.0.1:18005
export SURREALDB_NAMESPACE=constellation_test
export SURREALDB_NAME=constellation_test
export SURREALDB_DATABASE=constellation_test
export SURREALDB_USER=root
export SURREALDB_USERNAME=root
export SURREALDB_PASSWORD='<disposable-password>'
export SURREALDB_AUTH_LEVEL=root
```

Apply desired state only to this disposable database:

```bash
surrealkit sync --user "$SURREALDB_USER" --pass "$SURREALDB_PASSWORD"
surrealkit seed --user "$SURREALDB_USER" --pass "$SURREALDB_PASSWORD"
surrealkit test
vp run database-admin#compatibility \
  --environment test \
  --host "$SURREALDB_HOST" \
  --namespace "$SURREALDB_NAMESPACE" \
  --database "$SURREALDB_NAME" \
  --user "$SURREALDB_USER" \
  --password "$SURREALDB_PASSWORD"
```

Expected: schema release `constellation-v1` is compatible and all SurrealKit suites pass. Never use
`surrealkit sync` against the shared production database because sync can prune unmanaged state.

## 3. Automated Vertical Slice

```bash
vp run database-admin#smoke \
  --environment test \
  --confirm-disposable \
  --host "$SURREALDB_HOST" \
  --namespace "$SURREALDB_NAMESPACE" \
  --database "$SURREALDB_NAME" \
  --user "$SURREALDB_USER" \
  --password "$SURREALDB_PASSWORD"
```

The command creates unique records and verifies:

- Forge, Horizon, and Habitat identities are linked to one Constellation.
- A Workbench and durable source identity produce two immutable Releases.
- A healthy Runtime Instance activates the initial Domain Binding and Deployment Route.
- Stopping the Workbench does not stop or detach the active Deployment.
- An unhealthy replacement cannot change the route.
- A healthy replacement cuts over while retaining the previous Release.
- An offline tunnel makes the route ineligible and reconnects with the same connector identity.
- Habitat recovery preserves Runtime Instance ownership.
- Rollback reuses the first Release without rebuilding.
- Nine privileged lifecycle operations remain queryable in append-only audit records.

Save the returned `runId`, `host`, and record IDs with test evidence.

## 4. Service-Backed Exercise

Configure the internal control credentials described in `deploy/README.md`, then start Nova Cloud,
Habitat runtime control, Horizon, and the Habitat tunnel client. Register all roles and send a
heartbeat at least once per minute.

Expected health checks:

```text
Nova Cloud:       /api/surreal/health
Runtime control:  http://127.0.0.1:8787/health
Horizon:          http://127.0.0.1:8790/health
Native tunnel:    Horizon TCP 9443, restricted to Habitat
```

Create a test Studio and execute the normal APIs/UI in this order:

1. Create a Workbench and allocate its Workbench Instance on Habitat.
2. Write a small web/PWA application with a `/health` endpoint into its durable source volume.
3. Stop and resume the Workbench Instance; confirm Workbench ID and source files are unchanged.
4. Queue `web-pwa`; confirm Forge assignment and a checksum-addressed Release artifact.
5. Create a production Deployment and wait for the Runtime Instance to become healthy.
6. Verify domain ownership/certificate state, connect Habitat to Horizon, and activate the route.
7. Confirm HTTPS reaches the Release while no Habitat application port is publicly reachable.

## 5. Failure And Recovery Matrix

Perform one failure at a time and retain the previous healthy route until recovery:

| Injection                | Required observation                                             | Recovery                                                     |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| Stop Workbench           | Deployment and HTTPS remain available                            | Resume only if editing is needed                             |
| Fail replacement health  | Existing Deployment Route is unchanged                           | Fix/reprovision replacement, then reverify                   |
| Stop Habitat heartbeat   | Habitat and affected resources become unavailable, never deleted | Re-register node, reconcile runtime health, reconnect tunnel |
| Disconnect native tunnel | Connector becomes offline and route is ineligible                | Reconnect same connector key and revalidate route            |
| Restart Horizon          | TLS/control service restarts without cross-tenant resolution     | Heartbeat Horizon, reconnect Habitat, check route graph      |
| Roll back                | Route points to previous ready Release without a new Build Job   | Keep replaced Deployment superseded for audit                |

Invoke stale-node reconciliation from one trusted scheduler, not a browser request:

```bash
curl --fail-with-body --request POST \
  --header "Authorization: Bearer ${NOVA_CONSTELLATION_CONTROL_TOKEN}" \
  --header "X-Nova-Actor-Id: quickstart-reconciler" \
  --header "Content-Type: application/json" \
  --data '{}' \
  "${NOVA_CLOUD_URL}/api/internal/nodes/reconcile"
```

## 6. Production Read-Only Preflight

These operations read the live catalog or create an external backup file; they do not apply schema
or backfill writes:

```bash
vp run database-admin#catalog --environment production
vp run database-admin#backup --environment production
vp run database-admin#compare-live --environment production
vp run database-admin#backfill --environment production --dry-run
```

Record the backup path, SHA-256 checksum, byte size, desired/live definition counts, additive missing
count, changed count, and dry-run mapping counts. A nonzero `changed` count blocks rollout review.

## 7. Explicit Production Gate

Do not execute this section unless the operator explicitly approves the reviewed rollout identity and
backup from the same maintenance window:

```bash
surrealkit rollout plan --name constellation_expand
# Review database/rollouts/20260713_constellation_expand/rollout-review.md.
surrealkit rollout start <approved-rollout-id>
vp run database-admin#backfill --environment production --apply
vp run database-admin#verify-backfill --environment production
```

The expand operation may add definitions and idempotent mappings only. It must not drop or narrow a
legacy table, field, index, user, access method, or record. Do not run rollout completion or remove
legacy compatibility in this feature.

## 8. Evidence

Update `tasks.md` and `CHANGELOG.md` with timestamps, exact validation commands, smoke `runId`, backup
checksum, compare counts, and either the approved rollout identity or an explicit statement that
production remained untouched. Do not mark the production apply task complete without the operator
gate.
