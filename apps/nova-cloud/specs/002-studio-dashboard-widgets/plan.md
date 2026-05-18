# Implementation Plan: Studio Dashboard and Widget Foundation

**Branch**: `002-studio-dashboard-widgets` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-studio-dashboard-widgets/spec.md`

## Summary

Replace the current Studio overview body with a ShadCN-inspired responsive
dashboard composed of reusable widgets, while introducing a shared widget
renderer, registry, and chart foundation that can later support saved layouts
and integration-provided dashboard widgets.

## Technical Context

**Language/Version**: TypeScript 5.9, Svelte 5, SvelteKit 2.x  
**Primary Dependencies**: `vite-plus`, `@sveltejs/kit`, `svelte`, shadcn/bits-ui
component primitives, `surrealdb`, `layerchart`, ShadCN chart components  
**Storage**: SurrealDB-backed Studio and overview data; future widget layout
storage expected in Studio durable state or a dedicated widget config record  
**Testing**: `vp check`, `vp test`, targeted Studio overview route/API validation,
widget renderer unit coverage where practical, responsive dashboard review  
**Target Platform**: Responsive authenticated web app for desktop and mobile  
**Project Type**: SvelteKit web application  
**Performance Goals**: Dashboard should render without perceptible layout jank,
core widgets should remain responsive on mobile, and chart widgets should not
block the overview from becoming usable  
**Constraints**: Must preserve the current sidebar shell, must use real overview
data where possible, must remain compatible with future saved widget layouts,
must avoid over-specializing the widget schema to one provider or one chart type  
**Scale/Scope**: One Studio overview route, one shared widget renderer, a core
widget registry, initial core widgets, and a reusable chart foundation

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Studio-first semantics**: PASS. The work targets the Studio overview and
  uses Studio-scoped data and future Studio-scoped widget layout direction.
- **Runtime boundaries explicit**: PASS. Runtime is one dashboard data source,
  not a prerequisite for the dashboard shell itself.
- **Svelte 5 and Vite+ compliance**: PASS. The design remains inside the
  existing SvelteKit + Svelte 5 + `vp` toolchain.
- **Durable state before convenience**: PASS. The architecture is intentionally
  designed to allow future durable widget layout/config storage.
- **Validation is a release gate**: PASS. The plan includes checks, route
  validation, and responsive dashboard review.

## Project Structure

### Documentation (this feature)

```text
specs/002-studio-dashboard-widgets/
├── plan.md
└── spec.md
```

### Source Code (repository root)

```text
src/
├── routes/
│   └── (app)/app/studios/[studioId]/
│       ├── +page.svelte
│       └── +page.server.ts
├── lib/
│   ├── StudioCanvas/
│   │   └── Widgets/
│   │       ├── widget-renderer.svelte
│   │       ├── widget-registry.ts
│   │       ├── types.ts
│   │       ├── Core/
│   │       │   ├── core-chart.svelte
│   │       │   ├── core-chart-line.svelte
│   │       │   ├── core-chart-area.svelte
│   │       │   ├── core-chart-bar.svelte
│   │       │   ├── core-metric-card.svelte
│   │       │   ├── core-list.svelte
│   │       │   └── core-table.svelte
│   │       └── Stripe/
│   │           └── future integration widgets
│   ├── components/
│   │   └── ui/chart/
│   └── server/
│       └── studio-overview-state.ts
```

**Structure Decision**: Keep the dashboard implementation inside the existing
Nova Cloud app while introducing a new `StudioCanvas/Widgets` subtree for
reusable dashboard infrastructure.

## Complexity Tracking

No constitution violations currently require justification.

## Phase 0: Design Extraction From Existing Overview

Use the current overview route and server loader as the baseline data source.

Immediate design decisions:

- keep `/app` as the multi-Studio hub for now
- convert `/app/studios/[studioId]` into the first dashboard target
- reuse and expand `getStudioOverviewState`
- do not tie dashboard progress to drag-and-drop builder work

## Phase 1: Widget Foundation Design

### Widget model

The widget system will use a configuration-first model with:

- provider
- kind
- layout
- view
- filters
- toolbar
- source

Important design choice:

- `toolbar` remains generic rather than hardcoding date-range semantics into
  the base widget model

### Renderer design

`widget-renderer.svelte` will own:

- layout span handling
- widget shell framing
- loading/empty/error states
- widget dispatch through the registry

### Registry design

`widget-registry.ts` will provide:

- widget key lookup
- concrete Svelte component mapping
- future provider extension point

## Phase 2: Core Chart Design

The chart direction will use one shared `core.chart` model with
variant-specific rendering files.

Design outcomes:

- line, area, and bar should share most of the same normalized dataset model
- pie and radar may require remapping
- radial may require a more specialized mapping
- chart variants should render through separate files once complexity grows

Recommended initial files:

- `core-chart.svelte`
- `core-chart-line.svelte`
- `core-chart-area.svelte`
- `core-chart-bar.svelte`

## Phase 3: First Dashboard Composition

Replace the current overview body with a widget-driven responsive dashboard.

First release layout direction:

- top metric cards
- primary activity/chart row
- secondary summary widgets
- lower recent activity/list/table widgets

First release data direction:

- integrations count
- chats count
- jobs or recent runs
- workspaces summary
- runtime status
- files/storage summary
- recent artifacts or recent files

## Phase 4: Future Compatibility Hooks

The first pass should leave explicit room for:

- saved per-Studio widget layouts
- provider widget registration
- future widget builder controls
- future chart variant switching and compatibility validation

## Phase 5: Implementation Strategy

### Workstream A: Dashboard body replacement

- redesign `src/routes/(app)/app/studios/[studioId]/+page.svelte`
- keep the current page route and data source
- remove the current overview body narrative layout

### Workstream B: Widget infrastructure

- add `StudioCanvas/Widgets/types.ts`
- add `widget-renderer.svelte`
- add `widget-registry.ts`
- add initial core widget shells

### Workstream C: Core chart foundation

- add `core-chart.svelte`
- add first chart variants
- normalize chart data contract for overview-driven charts

### Workstream D: Overview data shaping

- extend or reshape overview-state payloads where needed
- derive dashboard-friendly summaries for counts and activity
- keep data server-driven

## Post-Design Constitution Check

- **Studio-first semantics**: PASS. The dashboard remains the Studio overview
  body and uses Studio-scoped real data.
- **Runtime boundaries explicit**: PASS. Runtime remains one widget source,
  not a global shell dependency.
- **Svelte 5 and Vite+ compliance**: PASS. The implementation remains within
  the current stack and uses local shadcn/chart primitives.
- **Durable state before convenience**: PASS. The widget config model is built
  for later durable storage without requiring it in phase one.
- **Validation is a release gate**: PASS. Route-level and component-level
  validation are planned before implementation.
