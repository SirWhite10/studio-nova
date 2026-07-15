# Tasks: Constellation Application Platform

**Input**: Design documents in `specs/006-constellation-stack/`  
**Branch**: `006-constellation-stack`  
**Started**: 2026-07-13  
**Execution rule**: Complete and timestamp each checkpoint before starting the next phase. Production operations remain gated and additive; destructive contract migration is not part of this execution.

## Format

- `[P]` tasks can be implemented in parallel because they touch independent files.
- `[US#]` maps work to the corresponding user story in `spec.md`.
- Every task names its primary implementation or validation path.

## Phase 1: Repository Setup

**Purpose**: Establish one schema project and shared packages without changing runtime behavior.

- [x] T001 Install and reconcile monorepo dependencies with `vp install` from `/home/sir/Nova_Projects/studio-nova`
- [x] T002 Create the SurrealKit project structure and operator documentation in `surrealkit.toml` and `database/README.md`
- [x] T003 [P] Create the shared lifecycle-contract package in `packages/data-contracts/package.json`, `packages/data-contracts/tsconfig.json`, and `packages/data-contracts/vite.config.ts`
- [x] T004 [P] Create the database administration package in `tools/database-admin/package.json`, `tools/database-admin/tsconfig.json`, and `tools/database-admin/vite.config.ts`
- [x] T005 [P] Add database administration environment examples and ignore rules in `tools/database-admin/.env.example` and `.gitignore`

**Checkpoint 1**: Repository scaffolding is dependency-resolved and discoverable by Vite+.  
**Completed at**: 2026-07-13T09:51:46-04:00 (`vp install`; 13 workspaces resolved)

---

## Phase 2: Authoritative Schema Foundation

**Purpose**: Capture the complete current contract, add the new model, and make schema operations testable before application cutover.

- [x] T006 Implement normalized lifecycle states, node capabilities, entity interfaces, and public exports in `packages/data-contracts/src/lifecycle.ts`, `packages/data-contracts/src/entities.ts`, `packages/data-contracts/src/ids.ts`, and `packages/data-contracts/src/index.ts`
- [x] T007 [P] Add lifecycle-transition and identifier tests in `packages/data-contracts/tests/lifecycle.test.ts` and `packages/data-contracts/tests/ids.test.ts`
- [x] T008 Capture all existing identity/auth definitions in `database/schema/00_identity/auth.surql`
- [x] T009 Capture all existing Studio/chat/job/file/integration definitions in `database/schema/10_studios/legacy-product.surql`, `database/schema/70_automation/legacy-automation.surql`, and `database/schema/80_integrations/legacy-integrations.surql`
- [x] T010 Capture all existing workspace/sandbox/runtime/edge definitions exactly in `database/schema/90_legacy/workspace-runtime.surql` and `database/schema/90_legacy/edge-routing.surql`
- [x] T011 Define schema metadata, Constellation, and infrastructure-node tables in `database/schema/60_infrastructure/constellation.surql`
- [x] T012 [P] Define Workbench and Workbench Instance tables in `database/schema/20_workbenches/workbenches.surql`
- [x] T013 [P] Define build-target, Build Job, Release, and Release Artifact tables in `database/schema/30_builds/builds.surql`
- [x] T014 [P] Define Deployment and Runtime Instance tables in `database/schema/40_deployments/deployments.surql`
- [x] T015 [P] Define Tunnel Connector, Domain Binding, and Deployment Route tables in `database/schema/50_edge/routing.surql`
- [x] T016 [P] Define immutable Audit Event records in `database/schema/60_infrastructure/audit.surql`
- [x] T017 Add idempotent setup metadata and initial target-profile seeds in `database/setup.surql` and `database/seed/build-target-profiles.surql`
- [x] T018 Add schema metadata, lifecycle, relationship, and tenant-isolation suites in `database/tests/config.toml`, `database/tests/suites/schema-metadata.toml`, `database/tests/suites/lifecycle.toml`, and `database/tests/suites/tenant-isolation.toml`
- [x] T019 Document an additive-only initial Constellation rollout policy with no legacy drops in `database/rollouts/README.md`

**Checkpoint 2**: Desired state contains every legacy definition plus all new schemafull entities; no destructive statement exists.  
**Completed at**: 2026-07-13T09:51:46-04:00 (SurrealKit 0.7.0: 12 files synced; 7/7 schema cases passed; contracts: 5/5 tests passed)

---

## Phase 3: Schema Operations and Compatibility (User Story 1, Priority P1)

**Goal**: Preserve existing records while adopting a centralized, observable schema lifecycle.

**Independent test**: Catalog a populated database, compare it with repository definitions, back it up, run an idempotent dry-run/backfill twice, and verify legacy/new reads agree.

### Tests

- [x] T020 [P] [US1] Add catalog normalization and comparison tests in `tools/database-admin/tests/catalog.test.ts`
- [x] T021 [P] [US1] Add schema compatibility and version-policy tests in `tools/database-admin/tests/compatibility.test.ts`
- [x] T022 [P] [US1] Add idempotent legacy-backfill planning tests in `tools/database-admin/tests/backfill.test.ts`

### Implementation

- [x] T023 [US1] Implement validated SurrealDB environment/config loading in `tools/database-admin/src/config.ts`
- [x] T024 [US1] Implement authenticated SQL transport and redacted errors in `tools/database-admin/src/surreal-http.ts`
- [x] T025 [US1] Implement read-only catalog extraction and stable normalization in `tools/database-admin/src/catalog.ts`
- [x] T026 [US1] Implement repository-versus-live comparison and missing-object reporting in `tools/database-admin/src/compare-live.ts`
- [x] T027 [US1] Implement timestamped backup/export with checksum metadata in `tools/database-admin/src/backup.ts`
- [x] T028 [US1] Implement schema-file validation and minimum-version checks in `tools/database-admin/src/compatibility.ts`
- [x] T029 [US1] Implement dry-run, idempotent legacy mapping and relationship verification in `tools/database-admin/src/backfill.ts`
- [x] T030 [US1] Expose safe `catalog`, `compare-live`, `backup`, `validate`, `compatibility`, `backfill`, and `verify-backfill` commands in `tools/database-admin/src/cli.ts`
- [x] T031 [US1] Replace Nova Cloud request/startup DDL with a read-only compatibility guard in `apps/nova-cloud/src/lib/server/surreal-schema.ts`, `apps/nova-cloud/src/hooks.server.ts`, and `apps/nova-cloud/src/lib/server/surreal-tables.ts`
- [x] T032 [US1] Remove feature-module `ensureTables()` calls while retaining normal queries in `apps/nova-cloud/src/lib/server/surreal-workspaces.ts`, `apps/nova-cloud/src/lib/server/surreal-sandbox.ts`, and `apps/nova-cloud/src/lib/server/surreal-runtime-processes.ts`
- [x] T033 [US1] Replace domain-control-owned DDL with compatibility checks in `tools/nova-domain-schema/src/ensure-schema.ts` and `apps/nova-domain-control/src/store.ts`
- [x] T034 [US1] Replace Nova Edge embedded DDL application with schema-version verification in `apps/nova-edge/crates/edge-store/src/schema/mod.rs` and `apps/nova-edge/crates/edge-store/src/client.rs`
- [x] T035 [US1] Add representative compatibility fixtures and migration agreement tests in `tools/database-admin/tests/fixtures/legacy.surql` and `tools/database-admin/tests/integration.test.ts`

**Checkpoint 3**: A disposable populated database passes backup, compare, expand, double-backfill, and compatibility checks while all old records remain readable.  
**Completed at**: 2026-07-13T10:15:56-04:00 (disposable schema strict compare: 375/375, 0 drift; 207,372-byte mode-0600 export checksum verified; populated double-backfill stable; database-admin 8 unit + 1 integration tests; Nova Cloud 928-file check; domain-control 17 tests; edge-store/nova-edge 79 tests + 6 doc tests. Production read-only compare: 152 matching live definitions, 223 additive missing, 0 drift; dry-run only, no production writes.)

---

## Phase 4: Studio Workbenches (User Story 2, Priority P1)

**Goal**: Allocate a private, replaceable development runtime whose source survives compute replacement.

**Independent test**: Create a Workbench for a Studio, allocate it on Habitat, write source, replace the instance, and confirm identity and files persist.

### Tests

- [x] T036 [P] [US2] Add Workbench ownership, slug, and lifecycle repository tests in `apps/nova-cloud/src/lib/server/surreal-workbenches.test.ts`
- [x] T037 [P] [US2] Add Workbench manifest rendering and durable-volume tests in `apps/nova-runtime-control/src/workbench/service.test.ts`

### Implementation

- [x] T038 [US2] Implement tenant-scoped Workbench and Workbench Instance repositories in `apps/nova-cloud/src/lib/server/surreal-workbenches.ts`
- [x] T039 [US2] Add idempotent Workbench create/list/resume/stop endpoints in `apps/nova-cloud/src/routes/api/studios/[studioId]/workbenches/+server.ts`, `apps/nova-cloud/src/routes/api/studios/[studioId]/workbenches/[workbenchId]/resume/+server.ts`, and `apps/nova-cloud/src/routes/api/studios/[studioId]/workbenches/[workbenchId]/stop/+server.ts`
- [x] T040 [US2] Preserve legacy workspace API behavior through Workbench adapters in `apps/nova-cloud/src/lib/server/surreal-workspaces.ts`
- [x] T041 [US2] Separate Workbench naming, persistent-volume, pod, service, and security-context manifests in `apps/nova-runtime-control/src/workbench/names.ts` and `apps/nova-runtime-control/src/workbench/manifests.ts`
- [x] T042 [US2] Implement idempotent Workbench allocate/resume/stop reconciliation in `apps/nova-runtime-control/src/workbench/service.ts`
- [x] T043 [US2] Add Workbench control routes while retaining legacy runtime aliases in `apps/nova-runtime-control/src/http.ts`
- [x] T044 [US2] Add least-privilege Workbench namespace, storage, network, and resource manifests in `deploy/k3s/workbenches/namespace.yaml`, `deploy/k3s/workbenches/rbac.yaml`, and `deploy/k3s/workbenches/network-policy.yaml`

**Checkpoint 4**: Workbench compute can be stopped/replaced without losing durable source or changing the logical Workbench.  
**Completed at**: 2026-07-13T10:28:31-04:00 (`nova-runtime-control`: 15-file check and 3/3 tests; `nova-cloud`: 933-file check and 4/4 Workbench repository tests against disposable SurrealDB; all 8 Workbench Kubernetes YAML documents parsed successfully.)

---

## Phase 5: Immutable Builds and Releases (User Story 3, Priority P1)

**Goal**: Turn Workbench source into an immutable, traceable Release and run it independently as a Deployment.

**Independent test**: Queue a compatible web build, produce a checksummed artifact/Release, deploy it, stop the Workbench, then verify the Deployment remains healthy.

### Tests

- [x] T045 [P] [US3] Add capability matching and Build Job transition tests in `apps/nova-cloud/src/lib/server/surreal-builds.test.ts`
- [x] T046 [P] [US3] Add immutable Release and artifact-integrity tests in `apps/nova-cloud/src/lib/server/surreal-releases.test.ts`
- [x] T047 [P] [US3] Add Deployment health-gate and rollback tests in `apps/nova-cloud/src/lib/server/surreal-deployments.test.ts`
- [x] T048 [P] [US3] Add Deployment manifest isolation tests in `apps/nova-runtime-control/src/deployments/service.test.ts`

### Implementation

- [x] T049 [US3] Implement target selection, capability matching, and Build Job repositories in `apps/nova-cloud/src/lib/server/surreal-builds.ts`
- [x] T050 [US3] Implement immutable Release and artifact repositories with SHA-256 validation in `apps/nova-cloud/src/lib/server/surreal-releases.ts`
- [x] T051 [US3] Implement Deployment and Runtime Instance repositories with guarded transitions in `apps/nova-cloud/src/lib/server/surreal-deployments.ts`
- [x] T052 [US3] Add build queue/status endpoints in `apps/nova-cloud/src/routes/api/studios/[studioId]/workbenches/[workbenchId]/builds/+server.ts` and `apps/nova-cloud/src/routes/api/builds/[buildJobId]/+server.ts`
- [x] T053 [US3] Add Deployment create/activate/rollback endpoints in `apps/nova-cloud/src/routes/api/studios/[studioId]/deployments/+server.ts`, `apps/nova-cloud/src/routes/api/deployments/[deploymentId]/activate/+server.ts`, and `apps/nova-cloud/src/routes/api/deployments/[deploymentId]/rollback/+server.ts`
- [x] T054 [US3] Implement isolated Deployment naming and manifests from immutable Release inputs in `apps/nova-runtime-control/src/deployments/names.ts` and `apps/nova-runtime-control/src/deployments/manifests.ts`
- [x] T055 [US3] Implement provision, health verification, drain, stop, and rollback runtime reconciliation in `apps/nova-runtime-control/src/deployments/service.ts`
- [x] T056 [US3] Add Deployment runtime routes in `apps/nova-runtime-control/src/http.ts`
- [x] T057 [US3] Add least-privilege Deployment namespace, service account, and network policies in `deploy/k3s/deployments/namespace.yaml`, `deploy/k3s/deployments/rbac.yaml`, and `deploy/k3s/deployments/network-policy.yaml`

**Checkpoint 5**: A web Release is immutable, traceable, independently deployable, and rollback-capable after Workbench shutdown.  
**Completed at**: 2026-07-13T10:48:24-04:00 (`data-contracts`: 5/5 tests; `nova-runtime-control`: 19-file check and 7/7 tests; `nova-cloud`: 945-file warning-free check, 9 unit tests, and a disposable-SurrealDB integration covering two Builds/Releases, failed replacement preservation, healthy cutover, rollback, and Workbench shutdown; all 8 Deployment Kubernetes YAML documents parsed successfully.)

---

## Phase 6: Horizon Domains and Native Tunnel (User Story 4, Priority P2)

**Goal**: Route verified HTTPS domains through Horizon only to the authorized healthy Deployment over the native Habitat tunnel.

**Independent test**: Activate one verified domain, reject cross-tenant and unhealthy routes, forward over port 9443, and preserve the prior route when activation fails.

### Tests

- [x] T058 [P] [US4] Add tenant-safe Domain Binding and Deployment Route repository tests in `apps/nova-cloud/src/lib/server/surreal-edge-routing.test.ts`
- [x] T059 [P] [US4] Add native connector identity and service-registration tests in `apps/nova-edge/crates/edge-tunnel/src/registry.rs`
- [x] T060 [P] [US4] Add atomic route-resolution and cross-tenant rejection tests in `apps/nova-edge/crates/edge-store/src/surreal_store.rs` and `apps/nova-edge/crates/edge-proxy/src/proxy.rs`

### Implementation

- [x] T061 [US4] Implement Domain Binding, Deployment Route, and Tunnel Connector repositories in `apps/nova-cloud/src/lib/server/surreal-edge-routing.ts`
- [x] T062 [US4] Migrate Studio domain endpoints to new records with legacy dual-write compatibility in `apps/nova-cloud/src/lib/server/studio-domains.ts` and `apps/nova-cloud/src/routes/api/studios/[studioId]/domains/+server.ts`
- [x] T063 [US4] Add authenticated deployment-route control operations in `apps/nova-cloud/src/lib/server/nova-domain-control.ts`
- [x] T064 [US4] Add new route/connector record types and legacy fallback conversion in `apps/nova-edge/crates/edge-store/src/types.rs` and `apps/nova-edge/crates/edge-store/src/surreal_store.rs`
- [x] T065 [US4] Enforce Constellation/node/connector identity during native tunnel registration in `apps/nova-edge/crates/edge-tunnel/src/control.rs` and `apps/nova-edge/crates/edge-tunnel/src/server.rs`
- [x] T066 [US4] Resolve only verified, healthy, tenant-matched Deployment Routes in `apps/nova-edge/crates/edge-proxy/src/proxy.rs`
- [x] T067 [US4] Protect the Horizon control API with scoped credentials and private/allowlist configuration in `apps/nova-edge/crates/edge-api/src/middleware/auth.rs`, `apps/nova-edge/crates/edge-config/src/config.rs`, and `apps/nova-edge/.env.example`

**Checkpoint 6**: HTTPS routes are tenant-safe, health-gated, atomically switchable, and carried through authenticated Habitat connectors.  
**Completed at**: 2026-07-13T11:21:08-04:00 (`nova-cloud`: warning-free 948-file check, 4/4 route repository integration tests against disposable SurrealDB; `nova-edge`: 260 affected regular tests plus real-SurrealDB route graph test covering tenant, health, connector, and route-preservation gates; `git diff --check`: clean.)

---

## Phase 7: Constellation Operations (User Story 5, Priority P2)

**Goal**: Register Forge, Horizon, and Habitat, observe their health, and audit every privileged lifecycle change.

**Independent test**: Register all three roles, send heartbeats, expire one heartbeat, and trace each active resource and route through audit records.

### Tests

- [x] T068 [P] [US5] Add node registration, heartbeat-expiry, and role validation tests in `apps/nova-cloud/src/lib/server/surreal-infrastructure.test.ts`
- [x] T069 [P] [US5] Add append-only audit-event tests in `apps/nova-cloud/src/lib/server/surreal-audit.test.ts`

### Implementation

- [x] T070 [US5] Implement Constellation, node registration, heartbeat, and capability repositories in `apps/nova-cloud/src/lib/server/surreal-infrastructure.ts`
- [x] T071 [US5] Implement redacted append-only lifecycle audit writes in `apps/nova-cloud/src/lib/server/surreal-audit.ts`
- [x] T072 [US5] Add authenticated node registration/heartbeat endpoints in `apps/nova-cloud/src/routes/api/internal/constellations/[constellationKey]/nodes/register/+server.ts` and `apps/nova-cloud/src/routes/api/internal/nodes/[nodeId]/heartbeat/+server.ts`
- [x] T073 [US5] Add schema, node, tunnel, runtime, and route readiness to service health responses in `apps/nova-cloud/src/routes/api/surreal/health/+server.ts`, `apps/nova-runtime-control/src/http.ts`, and `apps/nova-edge/crates/edge-api/src/handlers/health.rs`
- [x] T074 [US5] Document Forge/Horizon/Habitat registration, credentials, ports, recovery, and 8790 restrictions in `deploy/README.md` and `NOVA_EDGE_BUILDER_HANDOFF.md`

**Checkpoint 7**: Operators can identify every active node/resource relationship, detect stale infrastructure, and audit privileged changes.  
**Completed at**: 2026-07-13T11:40:04-04:00 (`nova-cloud`: warning-free 957-file check, 4 internal-auth tests, 23 isolated lifecycle/infrastructure integration tests against disposable SurrealDB, append-only audit UPDATE/DELETE rejection, and resource/route audit-trace assertions; `nova-runtime-control`: warning-free 19-file check; `nova-edge`: targeted rustfmt clean, workspace check successful with pre-existing warnings, 352/352 regular tests and 6/6 executed doc tests passed.)

---

## Phase 8: Multi-Target Scheduling and Secret Boundaries (User Story 6, Priority P3)

**Goal**: Reject incompatible builds before resource use and keep integration/signing secrets outside source, logs, artifacts, and agent context.

**Independent test**: Queue Linux/web and unavailable Apple/Windows targets, verify only compatible nodes receive jobs, and prove serialized records/logs contain secret references rather than values.

### Tests

- [x] T075 [P] [US6] Add target-profile capability matrix tests in `packages/data-contracts/tests/capabilities.test.ts`
- [x] T076 [P] [US6] Add secret-reference redaction tests in `apps/nova-cloud/src/lib/server/integration-secrets.test.ts`

### Implementation

- [x] T077 [US6] Expand seeded web, PWA, Android, iOS, macOS, Windows, Linux, server, and worker profiles in `database/seed/build-target-profiles.surql`
- [x] T078 [US6] Add deterministic missing-capability explanations and queue policy in `apps/nova-cloud/src/lib/server/surreal-builds.ts`
- [x] T079 [US6] Enforce opaque secret references and redacted serialization at build/runtime boundaries in `apps/nova-cloud/src/lib/server/integration-secrets.ts`, `apps/nova-runtime-control/src/config.ts`, and `packages/data-contracts/src/entities.ts`
- [x] T080 [US6] Document native host/toolchain/signing requirements and runner registration in `deploy/README.md`

**Checkpoint 8**: Build scheduling is capability-driven and no secret value crosses source, agent, log, artifact, or public API boundaries.  
**Completed at**: 2026-07-13T11:53:30-04:00 (`data-contracts`: warning-free check and 8/8 tests including Linux/macOS/Windows capability matrix; `nova-cloud`: warning-free 959-file check, deterministic seeded-target integration, 5/5 secret tests including encrypted tenant-scoped material storage, and 11/11 Build/Release/Deployment tests; `nova-runtime-control`: warning-free 20-file check and 9/9 tests; SurrealKit: 13 schema files plus 9 target seeds applied, 7/7 schema cases passed; `git diff --check`: clean.)

---

## Phase 9: End-to-End Validation and Additive Rollout

**Purpose**: Prove the vertical slice in isolation, then prepare a reversible production expand operation.

- [x] T081 Add disposable-database vertical-slice orchestration in `tools/database-admin/src/smoke.ts` and `tools/database-admin/tests/vertical-slice.test.ts`
- [x] T082 Add Workbench-to-Release-to-Deployment-to-route smoke instructions and assertions in `specs/006-constellation-stack/quickstart.md`
- [x] T083 Run `vp check`, `vp test`, recursive package checks/tests, and record results in `specs/006-constellation-stack/tasks.md`
- [x] T084 Run Nova Edge format, clippy, and workspace tests and record results in `specs/006-constellation-stack/tasks.md`
- [x] T085 Run catalog comparison and backup against production without mutation and record checksums/counts in `specs/006-constellation-stack/tasks.md`
- [x] T086 Generate and review the additive production rollout plan without starting it in `database/rollouts/20260713_constellation_expand/rollout-review.md`
- [ ] T087 Apply the additive rollout and idempotent backfill only after the explicit production gate, then record rollout identity/counts in `specs/006-constellation-stack/tasks.md`
- [x] T088 Validate node recovery, tunnel reconnection, route health-gating, Deployment independence, and rollback using `specs/006-constellation-stack/quickstart.md`
- [x] T089 Update implementation status and operational changes in `apps/nova-cloud/CHANGELOG.md` and `specs/006-constellation-stack/tasks.md`

**Checkpoint 9**: All Constellation-scoped automated checks and disposable smoke tests pass; production has either remained untouched or has received only an explicitly approved additive rollout with a verified backup.  
**Completed at**: 2026-07-13T12:19:39-04:00 for the pre-production scope. Production remained untouched and T087 remains intentionally gated.

### Checkpoint 9 Validation Record

- Repository: `vp check` passed 884 format inputs and 1,770 lint/type inputs; root `vp test` passed with the intentionally root-scoped no-test configuration.
- Package checks/tests: data contracts passed 8/8, database-admin passed 11/11 with 2 environment-gated tests skipped, runtime-control passed 9/9, domain-control passed 17/17, and all 33 targeted Nova Cloud Constellation tests passed.
- Disposable database: SurrealKit applied 13 schema files plus the target seed and passed 7/7 schema, lifecycle, and tenant-isolation cases.
- Vertical slice: fresh-schema smoke run `0eed5bd0b5414d2d9b3488da0bb3c40e` passed all 17 assertions, including Workbench independence, health-gated replacement, native tunnel reconnection, Habitat recovery, immutable Release rollback, and lifecycle audit completeness.
- Nova Edge: targeted Constellation `rustfmt --check` passed; ordinary workspace clippy completed; 352 workspace tests and 6 doctests passed. Strict `-D warnings` and full-workspace formatting remain blocked by established analytics/store/proxy warning and formatting debt, which was not rewritten as part of this feature.
- Recursive baseline: `vp run -r check` was run and remains blocked by existing Canvas/reference-shadcn prop/type errors and duplicate `@dnd-kit/geometry` versions. `vp run -r test` was run and remains blocked by the vendored Puck Turbo task being unable to resolve its package-manager binary. The affected Constellation packages pass independently as recorded above.
- Production read-only catalog: desired 391, live 152, additive missing 239, unexpected live 0, changed 0 against `main/main` through `https://surrealdb.dlxstudios.com`.
- Production backup: `database/backups/production-2026-07-13T16-11-21-266Z.surql`, 102,406 bytes, mode `0600`, SHA-256 `00b68f8a886b50920852e64d85a99dd11c6d49a0c3506e7f41f6a827dd7bcca4` verified locally.
- Production backfill dry-run: 18 planned statements covering 3 Workbenches, 2 Build Jobs, 2 Releases, 2 Deployments, 1 Runtime Instance, and 3 Domain Bindings; three legacy domains were safely skipped because they lacked a tenant-matched Deployment or connector.
- Catalog canonicalization: a clean disposable database compares 391 desired to 391 live definitions with 0 missing, 0 extra, and 0 changed, including SurrealDB v3 event definitions.
- SurrealKit rollout dry-run: `+13 ~0 -0` files and `+391 ~0 -0` entities; it would create `20260713161742__constellation_expand.toml`. No rollout manifest was written and no production schema or data mutation was started.

## Dependencies and Execution Order

1. Phase 1 is required before all later phases.
2. Phase 2 blocks repository/application schema work.
3. Phase 3 blocks application cutover and any production rollout.
4. Phases 4 and 7 may proceed independently after Phase 3.
5. Phase 5 depends on Phase 4 and node capabilities from Phase 7.
6. Phase 6 depends on healthy Deployments from Phase 5 and registered nodes from Phase 7.
7. Phase 8 depends on the Build Job model from Phase 5 and node capability model from Phase 7.
8. Phase 9 depends on all selected story phases; T087 additionally requires explicit operator approval at execution time.

## Resume Protocol

When work stops, update the active checkpoint with:

- the current timestamp;
- the last completed task ID;
- validation commands and outcomes;
- any production backup or rollout identifier;
- the exact blocker and next safe task.

Never infer completion from code presence alone. A task is checked only after its associated validation passes.
