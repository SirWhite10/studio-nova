# Implementation Plan: Studio Shell Marketplace Overhaul

**Branch**: `001-studio-shell-marketplace` | **Date**: 2026-05-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-studio-shell-marketplace/spec.md`

## Summary

Restructure the authenticated Nova Cloud Studio shell around grouped,
reorderable navigation with durable Studio-specific preferences, a command-style
global search surface, Content and marketplace entry points, and a consistent
page-shell redesign that aligns existing Studio pages to the Aura Gold direction
while reusing the current shadcn component system.

## Technical Context

**Language/Version**: TypeScript 5.9, Svelte 5, SvelteKit 2.x  
**Primary Dependencies**: `vite-plus`, `@sveltejs/kit`, `svelte`, shadcn/bits-ui
component primitives, `surrealdb`, `better-auth`, `svelte-sonner`  
**Storage**: SurrealDB for durable Studio state and preferences, R2-compatible
file storage for Content/Files summaries  
**Testing**: `vp check`, `vp test`, targeted Studio route/API validation, existing
Playwright coverage where applicable  
**Target Platform**: Responsive authenticated web app for desktop and mobile  
**Project Type**: SvelteKit web application  
**Performance Goals**: Shell interactions feel immediate, search returns the
first result set without perceptible blocking for typical Studio datasets, and
page-shell changes do not introduce layout jank during collapse/expand or scroll  
**Constraints**: Must remain inside the current Svelte 5 + Vite+ + shadcn stack,
must preserve Studio-first terminology, must not require runtime startup for
basic shell navigation, must persist user-visible shell state durably, must
avoid page-level horizontal overflow on audited Studio pages  
**Scale/Scope**: One authenticated app shell, one selected Studio context,
multiple Studio capability groups, high-value search result types, and existing
Studio pages that need shell/layout convergence

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Studio-first semantics**: PASS. Navigation, settings, content, and
  marketplace entry are all framed around the selected Studio rather than chat
  or sandbox as the top-level product noun.
- **Runtime boundaries explicit**: PASS. The shell reads runtime and deployment
  state, but core navigation and settings do not assume an always-on sandbox.
- **Svelte 5 and Vite+ compliance**: PASS. The plan stays inside current Svelte 5
  runes and `vp`-based workflows.
- **Durable state before convenience**: PASS. Sidebar ordering and appearance
  preferences will be persisted in durable Studio state rather than local-only
  UI state.
- **Validation is a release gate**: PASS. The plan includes `vp check`, tests,
  and explicit shell/layout verification flows.

## Project Structure

### Documentation (this feature)

```text
specs/001-studio-shell-marketplace/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── studio-shell-api.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── routes/
│   ├── (app)/app/
│   │   ├── +layout.svelte
│   │   ├── studios/[studioId]/
│   │   │   ├── +page.svelte
│   │   │   ├── files/+page.svelte
│   │   │   ├── jobs/+page.svelte
│   │   │   ├── runtime/+page.svelte
│   │   │   ├── settings/+page.svelte
│   │   │   ├── settings/+page.svelte
│   │   │   ├── skills/+page.svelte
│   │   │   ├── marketplace/+page.svelte                # planned
│   │   │   ├── deployments/+page.svelte                # planned
│   │   │   ├── sandbox/+page.svelte                    # planned
│   │   │   ├── agents/+page.svelte                     # planned
│   │   │   ├── memory/+page.svelte                     # planned
│   │   │   └── integrations/[integrationKey]/+page.svelte # planned
│   ├── api/app/
│   │   ├── sidebar-state/+server.ts
│   │   └── search/+server.ts                           # planned
│   └── api/studios/[studioId]/
│       ├── +server.ts
│       ├── navigation/+server.ts                       # planned
│       ├── overview-state/+server.ts
│       ├── files/+server.ts
│       ├── jobs/+server.ts
│       ├── domains/+server.ts
│       ├── integrations/[integrationKey]/+server.ts
│       └── workspaces/[workspaceId]/+server.ts
├── lib/
│   ├── components/
│   │   ├── app-sidebar.svelte
│   │   ├── studios/
│   │   ├── ui/sidebar/
│   │   ├── ui/command/
│   │   └── ui/tabs/
│   ├── server/
│   │   ├── sidebar-state.ts
│   │   ├── studio-overview-state.ts
│   │   ├── surreal-studios.ts
│   │   ├── surreal-integrations.ts
│   │   ├── surreal-workspaces.ts
│   │   └── r2-files.ts
│   ├── studios/
│   │   ├── constants.ts
│   │   ├── runtime-state.ts
│   │   └── types.ts
│   └── integrations/catalog.ts
└── tests/
    └── existing app/API coverage plus new Studio shell validation
```

**Structure Decision**: Use the existing SvelteKit web-app structure. Extend the
current app shell, Studio routes, and Surreal-backed server modules instead of
splitting the feature into separate frontend/backend packages.

## Complexity Tracking

No constitution violations currently require justification.

## Phase 0: Research Outcomes

Research decisions are captured in [research.md](./research.md). The main
outcomes are:

- keep shell preferences on the existing Studio durable state
- resolve sidebar structure from a server-side navigation registry
- ship global search as a command-style shell surface
- use native reorder interactions plus explicit move controls
- express the redesign through shared page-shell tokens and reused shadcn primitives
- keep marketplace scope focused on shell entry and initial Studio-aware discovery

## Phase 1: Design & Contracts

### Data model

The planned data model is documented in [data-model.md](./data-model.md).

Implementation direction:

- extend the existing `studio` durable state with `navigationProfile` and
  `appearanceSettings`
- treat navigation items as resolved views over existing Studio capabilities
- derive Content storage summaries from existing file/storage records
- keep search results ephemeral and generated server-side

### Interface contracts

The planned API and shell contracts are documented in
[contracts/studio-shell-api.md](./contracts/studio-shell-api.md).

New or expanded contracts expected in implementation:

- resolved sidebar state for the selected Studio
- Studio navigation persistence mutation
- richer Studio settings mutation shape
- app-level search endpoint
- marketplace entry route expectations

### Validation flow

The manual validation path is documented in [quickstart.md](./quickstart.md).

Expected automated validation:

- durable preference persistence tests
- sidebar state resolver coverage
- search endpoint coverage
- Studio settings save/cancel behavior validation
- shell overflow and sticky-header regression checks where testable

## Phase 2: Implementation Strategy

### Workstream A: Shell foundation

- replace the current flatter app sidebar composition with the `sidebar-7`
  structure using existing sidebar primitives
- add the global search entry and sticky shell header behavior
- create reusable page-shell patterns for consistent headers, sections, and
  content containers

### Workstream B: Durable Studio preferences

- extend Studio storage and mutation flows for navigation and appearance
  preferences
- normalize and resolve section/item order server-side
- refresh live shell state after preference updates

### Workstream C: Capability navigation

- map Agent, Workspace & Sandbox, Integrations, and Content sections to current
  and planned Studio destinations
- add marketplace entry behavior on the Integrations section
- surface Files and storage summary under Content

### Workstream D: Page convergence

- redesign Studio settings into a tabbed save/cancel workflow
- align existing Studio pages with the shared shell/page design
- add or stub planned destinations for deployments, sandbox, agents, memory,
  and marketplace as needed for coherent navigation

## Post-Design Constitution Check

- **Studio-first semantics**: PASS. The resolved shell, settings, and
  marketplace entry all stay Studio-scoped.
- **Runtime boundaries explicit**: PASS. Runtime and deployments remain visible
  capabilities without becoming shell prerequisites.
- **Svelte 5 and Vite+ compliance**: PASS. The design relies on existing local
  primitives and repo-standard tooling.
- **Durable state before convenience**: PASS. Saved navigation and appearance
  are persisted through durable Studio state.
- **Validation is a release gate**: PASS. Research, contracts, quickstart, and
  test expectations are all defined before tasks.
