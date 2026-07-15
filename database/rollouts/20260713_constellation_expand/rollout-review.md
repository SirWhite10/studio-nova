# Constellation Expand Rollout Review

**Status**: Reviewed, not started  
**Production gate**: Not granted  
**Scope**: Additive definitions and idempotent compatibility mappings only

## Preconditions

- [x] Production backup from the same maintenance window has a recorded path, byte size, and SHA-256.
- [x] Repository validation and disposable vertical-slice smoke are green.
- [x] Live catalog comparison reports zero changed authoritative definitions.
- [x] Backfill dry-run reports no cross-tenant or relationship conflicts.
- [ ] Nova Cloud, Runtime Control, Domain Control, and Nova Edge versions support `constellation-v1`.
- [ ] Forge, Horizon, and Habitat credentials and stable node keys are available.
- [ ] Operator explicitly approves the generated SurrealKit rollout identity.

## Additive Scope

The reviewed desired-state files add or retain:

- Constellation, infrastructure-node, and append-only audit definitions.
- Workbench and replaceable Workbench Instance definitions.
- Build Target Profile, Build Job, immutable Release, and immutable Release Artifact definitions.
- Deployment and Runtime Instance definitions.
- Tunnel Connector, Domain Binding, and Deployment Route definitions.
- Dedicated encrypted integration secret material referenced through `secret://...` identifiers.
- Non-secret build target seeds for web, PWA, Android, iOS, macOS, Windows, Linux, server, and worker.

Legacy identity, Studio, chat, automation, integration, workspace, runtime, FRP, proxy, and domain
definitions remain present. This rollout contains no `REMOVE`, `DELETE`, `TRUNCATE`, table drop,
field narrowing, or permission broadening operation.

## Review Commands

```bash
vp run database-admin#validate
vp run database-admin#compare-live --environment production --host https://surrealdb.dlxstudios.com
vp run database-admin#backfill --environment production --host https://surrealdb.dlxstudios.com --dry-run
surrealkit rollout plan --name constellation_expand --dry-run
```

Before approval, inspect the generated manifest and reject it if any operation is not additive. The
rollout must target the same namespace/database represented by the recorded backup and catalog.

## Execution Sequence After Approval

1. Reconfirm the production backup checksum and zero changed-definition comparison.
2. Start the approved SurrealKit expand rollout.
3. Verify `schema_release:constellation_v1` and service compatibility.
4. Run the idempotent backfill with `--apply` once, then run it a second time to prove zero new work.
5. Register Forge, Horizon, and Habitat and begin one-minute heartbeats.
6. Deploy compatibility readers/writers and observe health before activating any new public route.
7. Run the service-backed quickstart with a dedicated test Studio and domain.

## Abort And Recovery

- Stop before backfill if schema application reports any changed or destructive definition.
- Stop before route activation if a node, Runtime Instance, connector, certificate, or tenant check is
  not ready.
- Preserve all legacy records and continue serving through legacy routes during diagnosis.
- Use the recorded logical backup for investigation; do not overwrite production with it without a
  separate restoration decision.
- Roll back only the in-progress SurrealKit rollout identity. Do not run a blanket schema sync.

## Evidence To Record

| Item                                 | Value                                                                                                                                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preflight timestamp                  | 2026-07-13T12:17:50-04:00                                                                                                                                                                                                                 |
| Backup path/checksum/bytes           | `database/backups/production-2026-07-13T16-11-21-266Z.surql`; SHA-256 `00b68f8a886b50920852e64d85a99dd11c6d49a0c3506e7f41f6a827dd7bcca4`; 102,406 bytes; mode `0600`                                                                      |
| Desired/live/additive/changed counts | 391 desired; 152 live; 239 additive missing; 0 unexpected live; 0 changed                                                                                                                                                                 |
| Backfill dry-run counts              | 18 statements: 3 Workbenches, 0 Workbench Instances, 2 Build Jobs, 2 Releases, 2 Deployments, 1 Runtime Instance, 0 Tunnel Connectors, 3 Domain Bindings, 0 Deployment Routes; 3 tenant/connector-ineligible legacy routes safely skipped |
| Disposable canonical comparison      | 391 desired; 391 live; 0 missing; 0 unexpected; 0 changed, including event definitions                                                                                                                                                    |
| SurrealKit dry-run                   | `+13 ~0 -0` files; `+391 ~0 -0` entities; would create `20260713161742__constellation_expand.toml`                                                                                                                                        |
| Generated rollout identity           | Not created; dry-run only                                                                                                                                                                                                                 |
| Operator approval                    | Not granted                                                                                                                                                                                                                               |
| Apply timestamp                      | Not started                                                                                                                                                                                                                               |
