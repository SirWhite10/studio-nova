# Research: Constellation Application Platform

## Decision 1: Repository-Level SurrealKit Project

**Decision**: Use the official SurrealKit layout at `database/`, with `surrealkit.toml` at repository root.

**Rationale**: The schema is consumed by TypeScript, Rust, and Go code. SurrealKit provides desired-state schema files, production rollouts, snapshots, seeds, tests, and type generation without assigning DDL ownership to one application.

**Alternatives considered**: Keeping DDL in Nova Cloud perpetuates request-time mutation; placing it in a package implies JavaScript ownership; keeping separate embedded schemas causes drift.

## Decision 2: Baseline Before Sync

**Decision**: Mirror the full live catalog and create a SurrealKit rollout baseline before any sync or rollout operation.

**Rationale**: The current live database contains definitions absent from every repository schema copy. SurrealKit sync can prune definitions not represented in its desired state.

**Alternatives considered**: Importing the existing Nova Cloud reference file would omit production tables and fields. Re-running all current `ensureTables()` calls would not capture drift or provide rollback.

## Decision 3: Expand/Cutover/Contract Migration

**Decision**: Introduce new physical tables additively, backfill and dual-read, then retire legacy writes only after observation. Destructive cleanup requires a separate explicit checkpoint.

**Rationale**: Existing records use overloaded `workspace`, `sandbox`, and `workspace_deployment` semantics. Immediate renames would couple data conversion, service deployment, and routing into one irreversible event.

**Alternatives considered**: In-place renames are faster but remove rollback. Keeping only aliases never resolves the model ambiguity.

## Decision 4: Schemafull New Entities and Record Links

**Decision**: New lifecycle and infrastructure tables are schemafull, use constrained status values, and use record references for internal relationships. Existing auth identifiers remain strings for compatibility.

**Rationale**: Schemafull definitions catch misspelled or missing fields, while record links make ownership and route traversal explicit. Legacy tables remain unchanged during compatibility phases.

**Alternatives considered**: Schemaless tables are flexible but already allowed drift. Converting Better Auth identifiers to records would create unnecessary authentication risk.

## Decision 5: Application Startup Checks, Not DDL

**Decision**: Services check a required schema compatibility marker during startup and expose failure through health status. Only database administration workflows may apply DDL.

**Rationale**: Page-request bootstrap creates races, gives application credentials schema authority, and makes rollout behavior depend on which service starts first.

**Alternatives considered**: Embedded startup sync is appropriate for disposable databases, not the shared production database.

## Decision 6: Separate Workbench, Release, and Deployment

**Decision**: A Studio owns private Workbenches; Build Jobs create immutable Releases; Deployments run Releases independently from Workbench compute.

**Rationale**: Development environments expire and are user/agent writable. Production must be immutable, health-checked, rollback-capable, and unaffected by Workbench shutdown.

**Alternatives considered**: Publishing the development container is simple but insecure, difficult to reproduce, and impossible to scale or roll back reliably.

## Decision 7: Native Habitat-to-Horizon Tunnel

**Decision**: Standardize the primary path on Nova Edge's authenticated native yamux tunnel over port 9443. FRP remains legacy compatibility until migrated.

**Rationale**: Horizon already runs the native listener and registry, and public traffic terminates on ports 80/443. Habitat can make outbound connections without exposing application ports.

**Alternatives considered**: Running both native tunnel and frps permanently duplicates routing and authentication. Cloudflare tunnels remain suitable for infrastructure endpoints such as the database but do not replace per-Deployment routing.

## Decision 8: Capability-Based Build Scheduling

**Decision**: Represent build target requirements and node capabilities in data. Linux handles the initial web/PWA, Android, and Linux paths; macOS and Windows runners are separately registered when available.

**Rationale**: iOS/macOS and Windows builds require their native host toolchains. Modeling capabilities now prevents jobs from being sent to incompatible nodes and avoids hardcoding one compiler image.

**Alternatives considered**: A single universal container cannot provide supported Apple or Windows signing/build environments.

## Decision 9: Secret Broker Boundary

**Decision**: Store only secret references in platform entities. Inject credentials into authorized build/runtime operations, never Workbench source, agent context, logs, or Release metadata.

**Rationale**: User-provided integration and signing keys must not become part of generated source or model context.

**Alternatives considered**: Environment variables stored directly in records are easy but increase leakage and audit risk.

## Decision 10: Durable Source and Immutable Artifacts

**Decision**: Workbench source volumes and Release artifact storage outlive compute instances. Runtime state is recreated from a Release plus environment configuration.

**Rationale**: Container lifetimes, Workbench expiration, and node restarts must not erase user work or production versions.

**Alternatives considered**: Container-local storage is unsuitable for recovery. Rebuilding on every deployment breaks reproducibility and rollback timing.

## Decision 11: Stable Terminology with Legacy Adapters

**Decision**: Use Studio, Workbench, Release, Deployment, Runtime Instance, Forge, Horizon, Habitat, and Constellation in new contracts. Keep adapters for legacy table/API names during migration.

**Rationale**: The new vocabulary distinguishes durable project identity, private development, immutable output, and public execution without forcing a risky one-step database rename.

**Alternatives considered**: Continuing to overload “workspace” leaves ownership and lifecycle ambiguous. Renaming every UI, API, and table at once is unnecessarily disruptive.

## References

- SurrealKit schema migration: https://surrealdb.com/docs/manage/schema-migration
- Existing database baseline: https://surrealdb.com/docs/manage/schema-migration/getting-started/existing-databases
- Production rollouts: https://surrealdb.com/docs/manage/schema-migration/rollouts
- Schemafull tables: https://surrealdb.com/docs/reference/query-language/statements/define/table
- Flutter target host requirements: https://docs.flutter.dev/platform-integration
