# Implementation Plan: Constellation Application Platform

**Branch**: `006-constellation-stack` | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/006-constellation-stack/spec.md`

## Summary

Centralize all SurrealDB definitions under a repository-level SurrealKit project, capture the live database as a compatibility baseline, and add the Constellation lifecycle model without destructive renames. The first complete vertical slice creates a durable Studio, allocates a private Workbench on Habitat, produces an immutable Release, starts an independent Deployment, and routes a domain through Horizon over the native authenticated tunnel. Existing Nova Cloud features and legacy records remain operational throughout an expand, cutover, and later contract migration.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node.js 24 for control services; Svelte 5.49 and SvelteKit 2.50 for Nova Cloud; Rust 2024 edition on Rust 1.93 for Horizon  
**Primary Dependencies**: SurrealDB 3.0.5 server, SurrealDB JS SDK 2.0.3, SurrealDB Rust SDK 3.x, SurrealKit, K3s/containerd, Axum 0.8, Tokio 1.x, yamux 0.13, Vite+  
**Storage**: SurrealKV on Habitat; persistent Workbench volumes; immutable Release artifacts in durable object or filesystem storage; Horizon certificate storage  
**Testing**: Vite+/Vitest and TypeScript checks, SurrealKit schema tests, Rust workspace tests, manifest rendering tests, authenticated integration and smoke tests  
**Target Platform**: Linux Forge/Horizon/Habitat nodes initially; capability-modeled macOS and Windows builders later  
**Project Type**: Monorepo containing web application, control-plane services, database project, Rust edge service, deployment manifests, and shared contracts  
**Performance Goals**: Workbench allocation under 60 seconds; route cutover and rollback under 30 seconds; schema compatibility check under 5 seconds; normal control reads under 500 ms p95  
**Constraints**: No production schema mutation during page requests; no destructive migration before cutover proof; no public Habitat runtime ports; no secret material in source, logs, artifacts, or agent context; current auth/chat/job behavior must remain compatible  
**Scale/Scope**: Initial single Constellation with one Forge, one Horizon, and one Habitat; schema and contracts support multiple nodes, Studios, Workbenches, targets, Releases, Deployments, routes, and connectors

## Constitution Check

_Gate evaluated before research and re-evaluated after design._

- **Studio-first information architecture: PASS.** Studio remains the durable user-facing owner; Workbenches, builds, Releases, Deployments, domains, and integrations reference it.
- **State-driven design: PASS.** Every operational entity has explicit lifecycle states, failure details, empty/loading/error contract behavior, and independently testable transitions.
- **Action-first copy and economics: PASS.** UI work is limited to terminology and operational actions; pricing changes are outside this feature.
- **Data-driven controls: PASS.** Node capabilities, build targets, statuses, ownership, and route metadata are stored and returned rather than hardcoded in UI components.
- **Modern Svelte and accessibility: PASS.** Any Nova Cloud surface changed by this feature must use Svelte 5 runes, existing responsive shells, and keyboard-accessible controls.
- **Delivery gates: PASS.** Specification, plan, data model, contracts, quickstart, task checklist, automated tests, and checkpoint timestamps are required before code cutover.
- **Post-design re-check: PASS.** No constitutional exception is required.

## Migration Strategy

1. **Inventory and backup**: Export the live database and extract every current definition. Never start with a partial schema file.
2. **Baseline**: Mirror the live catalog under `database/schema/legacy` and capture SurrealKit snapshots without modifying production.
3. **Expand**: Add schemafull Constellation, node, Workbench, build, Release, Deployment, route, connector, and audit tables.
4. **Compatibility**: Keep existing `workspace`, `sandbox`, `workspace_deployment`, `runtime_process`, `workspace_proxy`, `proxy_domain`, and `frp_client` tables. Add idempotent backfill and dual-read mappings.
5. **Application cutover**: Move schema ownership out of Nova Cloud, domain-control, and Nova Edge. Services check schema compatibility at startup and use new repositories/contracts.
6. **Runtime cutover**: Allocate Workbench compute separately from Deployment runtime, produce immutable artifacts, health-check, activate routes, and preserve rollback.
7. **Contract phase**: Only after production observation and an explicit checkpoint may legacy writes or definitions be removed. This phase is planned but not automatically executed by this implementation.

## Project Structure

### Documentation

```text
specs/006-constellation-stack/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── control-plane.openapi.yaml
│   ├── schema-operations.md
│   └── tunnel-runtime.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code

```text
database/
├── README.md
├── setup.surql
├── schema/
│   ├── 00_identity/
│   ├── 10_studios/
│   ├── 20_workbenches/
│   ├── 30_builds/
│   ├── 40_deployments/
│   ├── 50_edge/
│   ├── 60_infrastructure/
│   ├── 70_automation/
│   ├── 80_integrations/
│   └── 90_legacy/
├── rollouts/
├── snapshots/
├── seed/
├── tests/
└── types/

surrealkit.toml

packages/data-contracts/
├── package.json
├── src/
│   ├── generated/
│   ├── entities.ts
│   ├── ids.ts
│   ├── lifecycle.ts
│   └── index.ts
└── tests/

tools/database-admin/
├── package.json
├── src/
│   ├── catalog.ts
│   ├── compatibility.ts
│   ├── backfill.ts
│   └── cli.ts
└── tests/

apps/nova-cloud/src/lib/server/
├── surreal.ts
├── surreal-schema.ts
├── surreal-workbenches.ts
├── surreal-builds.ts
├── surreal-releases.ts
├── surreal-deployments.ts
├── surreal-infrastructure.ts
└── surreal-edge-routing.ts

apps/nova-runtime-control/src/
├── workbench/
├── builds/
├── deployments/
├── contracts/
└── runtime/

apps/nova-edge/crates/
├── edge-api/
├── edge-store/
├── edge-tunnel/
├── edge-tls/
└── nova-edge/

deploy/k3s/
├── workbenches/
├── deployments/
└── surrealdb/
```

**Structure Decision**: SurrealQL is language-neutral and therefore belongs at repository root in the official SurrealKit layout. JavaScript packages may expose generated contracts but do not own DDL. Tools execute and verify schema operations but do not contain the desired state. Application and Rust services retain their own query/repository implementations while sharing stable entity names and lifecycle contracts.

## Validation Strategy

- Compare repository schema objects against the live catalog before baseline.
- Run SurrealKit validation and isolated schema behavior/security suites.
- Run compatibility tests against representative legacy records.
- Verify Nova Cloud no longer performs DDL during requests or ordinary startup.
- Run Vite+ formatting, linting, type checks, and tests across affected packages/apps.
- Run Rust formatting, clippy where practical, and workspace tests for Nova Edge.
- Render and inspect K3s manifests without applying them before smoke testing.
- Execute the quickstart on a disposable database and namespace before any production rollout.
- Back up production, apply only the additive rollout, verify existing flows, and record timestamped checkpoints.

## Complexity Tracking

No constitutional violations. Multiple services and languages already exist because Horizon must be a small native edge binary while Nova Cloud and Habitat control services use the existing TypeScript stack. The new database boundary reduces rather than adds schema ownership complexity.
