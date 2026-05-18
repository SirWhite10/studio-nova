# Tasks: Studio Dashboard and Widget Foundation

**Input**: Design documents from `/specs/002-studio-dashboard-widgets/`  
**Prerequisites**: `plan.md`, `spec.md`

**Tests**: Validation is required by the project constitution. Add or update
targeted coverage where it provides direct confidence for the widget renderer,
overview dashboard composition, and core chart behavior.

**Organization**: Tasks are grouped by user story to support incremental
delivery and independent validation.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish feature entry points and shared types for the dashboard
and widget system.

- [ ] T001 Define dashboard widget types and chart config contracts in `src/lib/StudioCanvas/Widgets/types.ts`
- [ ] T002 [P] Create widget registry scaffolding in `src/lib/StudioCanvas/Widgets/widget-registry.ts`
- [ ] T003 [P] Create widget directory scaffolding under `src/lib/StudioCanvas/Widgets/Core/` and `src/lib/StudioCanvas/Widgets/Stripe/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared widget renderer and server data shaping that all
dashboard widgets depend on.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [ ] T004 Create the shared widget renderer shell in `src/lib/StudioCanvas/Widgets/widget-renderer.svelte`
- [ ] T005 [P] Add shared widget shell states and layout-span helpers in `src/lib/StudioCanvas/Widgets/widget-renderer.svelte`
- [ ] T006 Create the initial core widget registry entries in `src/lib/StudioCanvas/Widgets/widget-registry.ts`
- [ ] T007 [P] Reshape Studio overview data into dashboard-friendly summaries in `src/lib/server/studio-overview-state.ts`
- [ ] T008 [P] Extend the Studio overview server loader for widget-oriented data in `src/routes/(app)/app/studios/[studioId]/+page.server.ts`

**Checkpoint**: Shared widget infrastructure and overview-ready data contracts are ready.

---

## Phase 3: User Story 1 - View a Studio Dashboard (Priority: P1) 🎯 MVP

**Goal**: Replace the current Studio overview body with a real dashboard using
responsive grid composition and real Nova data.

**Independent Test**: Open `/app/studios/[studioId]` on mobile and desktop and
confirm the body renders as a responsive dashboard with real widgets instead of
the current long-form overview layout.

### Implementation for User Story 1

- [ ] T009 [US1] Replace the Studio overview body with a dashboard grid layout in `src/routes/(app)/app/studios/[studioId]/+page.svelte`
- [ ] T010 [US1] Create the first metric-card widget in `src/lib/StudioCanvas/Widgets/Core/core-metric-card.svelte`
- [ ] T011 [P] [US1] Create the first list-style widget in `src/lib/StudioCanvas/Widgets/Core/core-list.svelte`
- [ ] T012 [P] [US1] Create the first table-style widget in `src/lib/StudioCanvas/Widgets/Core/core-table.svelte`
- [ ] T013 [US1] Render top-level overview metric widgets through `src/lib/StudioCanvas/Widgets/widget-renderer.svelte`
- [ ] T014 [US1] Render lower overview activity/list widgets through `src/lib/StudioCanvas/Widgets/widget-renderer.svelte`

**Checkpoint**: The Studio overview is now a responsive widget dashboard using real data.

---

## Phase 4: User Story 2 - Reuse a Stable Widget Shell (Priority: P1)

**Goal**: Ensure multiple widget types render through one shared widget shell
and registry rather than bespoke page-specific card implementations.

**Independent Test**: Render at least metric, list, and table widgets through
the registry-driven widget renderer and confirm they share shell behavior and
layout span handling.

### Implementation for User Story 2

- [ ] T015 [US2] Add widget dispatch logic and registry resolution to `src/lib/StudioCanvas/Widgets/widget-renderer.svelte`
- [ ] T016 [US2] Add generic widget header, title, description, and state rendering to `src/lib/StudioCanvas/Widgets/widget-renderer.svelte`
- [ ] T017 [US2] Move overview widget declarations into config-driven structures in `src/routes/(app)/app/studios/[studioId]/+page.svelte`
- [ ] T018 [P] [US2] Add provider/kind validation and unknown-widget fallback behavior in `src/lib/StudioCanvas/Widgets/widget-registry.ts`

**Checkpoint**: The overview dashboard is registry-driven rather than page-hardcoded.

---

## Phase 5: User Story 3 - Support Reusable Chart Widgets (Priority: P2)

**Goal**: Introduce a shared core chart foundation that supports multiple chart
variants and generic toolbar controls.

**Independent Test**: Render line, area, and bar charts through the shared
chart architecture and confirm compatible chart data can be reused across the
variants.

### Implementation for User Story 3

- [ ] T019 [US3] Create the shared chart host in `src/lib/StudioCanvas/Widgets/Core/core-chart.svelte`
- [ ] T020 [P] [US3] Implement the line chart variant in `src/lib/StudioCanvas/Widgets/Core/core-chart-line.svelte`
- [ ] T021 [P] [US3] Implement the area chart variant in `src/lib/StudioCanvas/Widgets/Core/core-chart-area.svelte`
- [ ] T022 [P] [US3] Implement the bar chart variant in `src/lib/StudioCanvas/Widgets/Core/core-chart-bar.svelte`
- [ ] T023 [US3] Add generic toolbar/control rendering for chart widgets in `src/lib/StudioCanvas/Widgets/Core/core-chart.svelte`
- [ ] T024 [US3] Add chart widget registry entries and variant routing in `src/lib/StudioCanvas/Widgets/widget-registry.ts`
- [ ] T025 [US3] Add the first overview chart widget to `src/routes/(app)/app/studios/[studioId]/+page.svelte`

**Checkpoint**: The dashboard supports reusable chart widgets through one shared chart model.

---

## Phase 6: User Story 4 - Prepare for Future Custom Widget Layouts (Priority: P3)

**Goal**: Preserve a clean extension path for saved widget layouts and future
integration-provided widgets.

**Independent Test**: Review the widget config shape and registry entries and
confirm they support provider namespacing, layout spans, view options, and
future toolbar/filter state without page-specific assumptions.

### Implementation for User Story 4

- [ ] T026 [US4] Add layout/view/filter/toolbar fields to the exported widget config types in `src/lib/StudioCanvas/Widgets/types.ts`
- [ ] T027 [US4] Add chart variant compatibility comments or guards in `src/lib/StudioCanvas/Widgets/types.ts` and `src/lib/StudioCanvas/Widgets/Core/core-chart.svelte`
- [ ] T028 [P] [US4] Add placeholder Stripe widget registry scaffolding in `src/lib/StudioCanvas/Widgets/Stripe/` and `src/lib/StudioCanvas/Widgets/widget-registry.ts`
- [ ] T029 [US4] Document the first default overview widget layout in `src/routes/(app)/app/studios/[studioId]/+page.svelte`

**Checkpoint**: The dashboard foundation is ready for future saved layouts and integration widgets.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate the dashboard foundation, tighten responsive behavior,
and leave the feature ready for implementation follow-through.

- [ ] T030 [P] Add focused validation for widget config and registry behavior in `tests/` or existing dashboard-related coverage
- [ ] T031 [P] Add focused validation for the Studio overview dashboard rendering in `tests/` or existing route coverage
- [ ] T032 [P] Update supporting developer guidance for the widget system in `apps/nova-cloud/planning/` or adjacent implementation notes if needed
- [ ] T033 Run `vp check` and `vp test`, then fix remaining issues in touched files under `src/` and `tests/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories
- **User Story 1 (Phase 3)**: Starts after Foundational completion
- **User Story 2 (Phase 4)**: Starts after Foundational completion and benefits from US1 dashboard composition
- **User Story 3 (Phase 5)**: Starts after Foundational completion and can layer onto the renderer used by US1 and US2
- **User Story 4 (Phase 6)**: Starts after Foundational completion and should follow the main widget model decisions from US2 and US3
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1** is the MVP and should land first.
- **US2** depends on the shared widget shell and renderer from the foundational phase.
- **US3** depends on the widget registry and overview dashboard composition.
- **US4** depends on the widget model being stable enough to preserve future extension hooks.

### Within Each User Story

- Shared types and registry precede widget dispatch logic.
- Renderer state handling precedes page-level widget declarations.
- Overview data shaping precedes meaningful widget display.
- Core chart host precedes specific chart variants.

### Parallel Opportunities

- T002 and T003 can run in parallel.
- T005, T007, and T008 can run in parallel after T004 is in place.
- T011 and T012 can run in parallel once T009 and T010 establish the dashboard direction.
- T020, T021, and T022 can run in parallel after T019 defines the shared chart host contract.
- T030, T031, and T032 can run in parallel during polish.

## Parallel Example: User Story 3

```bash
Task: "Implement the line chart variant in src/lib/StudioCanvas/Widgets/Core/core-chart-line.svelte"
Task: "Implement the area chart variant in src/lib/StudioCanvas/Widgets/Core/core-chart-area.svelte"
Task: "Implement the bar chart variant in src/lib/StudioCanvas/Widgets/Core/core-chart-bar.svelte"
```

## Implementation Strategy

### MVP First

1. Complete Setup
2. Complete Foundational work
3. Complete User Story 1
4. Validate the dashboard body replacement before moving to more advanced widget abstraction

### Incremental Delivery

1. Replace the current overview body with a responsive dashboard using real data
2. Move the dashboard blocks behind the shared renderer and registry
3. Add shared chart support
4. Preserve future layout and provider extension hooks

### Team Parallelism

With multiple implementers:

1. One owner can handle overview data shaping and server contracts
2. One owner can build the widget renderer and registry
3. One owner can convert the overview page into a config-driven dashboard
4. One owner can build the core chart host and initial chart variants

## Notes

- `[P]` tasks are limited to work that can proceed on different files without
  blocking unfinished dependencies.
- The first pass intentionally stops short of drag-and-drop widget editing and
  durable saved widget layouts, but the types and registry should preserve those paths.
