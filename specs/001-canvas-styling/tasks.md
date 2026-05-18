# Tasks: Canvas Styling Layer

**Input**: Design documents from `/specs/001-canvas-styling/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Explicit TDD tasks are not included for this feature. Verification is performed
through package `prepack`, package `build`, and direct demo rendering checks defined in the
plan and quickstart.

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the Canvas package structure for a primitive layer plus semantic
component layer.

- [ ] T001 Create semantic component directories for layout, card, and dashboard exports under `packages/canvas/src/lib/components/`
- [ ] T002 Define the initial Canvas public export surface in `packages/canvas/src/lib/index.ts`
- [ ] T003 [P] Capture the current dashboard reference slice boundaries in `packages/canvas/src/routes/+page.svelte` and related local demo data usage

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the primitive substrate and shared styling utilities that all user
stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Refine the primitive `View` contract in `packages/canvas/src/lib/base/view/view.types.ts` to support semantic wrappers without expanding the raw authoring surface
- [ ] T005 Update primitive style computation in `packages/canvas/src/lib/base/view/view-styles.svelte.ts` and `packages/canvas/src/lib/base/view/view-layout.svelte.ts` for the spacing and shell needs of the dashboard slice
- [ ] T006 Create `ViewFlex` and `ViewGrid` primitive wrappers in `packages/canvas/src/lib/components/layout/`
- [ ] T007 [P] Add shared dashboard-facing style tokens or helper mappings in `packages/canvas/src/lib/components/layout/` or `packages/canvas/src/lib/components/card/` to keep Canvas-owned styling consistent across the first slice
- [ ] T008 Export the primitive and layout foundation from `packages/canvas/src/lib/index.ts`

**Checkpoint**: Primitive foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Recreate Dashboard Shell (Priority: P1) 🎯 MVP

**Goal**: Render the Canvas demo home page with a Canvas-owned dashboard shell that preserves
the reference dashboard’s structure and hierarchy.

**Independent Test**: Load the Canvas home page and verify that the sidebar shell, page
header, metric card section, chart shell, and table shell appear in the same overall order
and structure as the supported reference slice.

### Implementation for User Story 1

- [ ] T009 [P] [US1] Implement the semantic card family in `packages/canvas/src/lib/components/card/` for `Card`, `CardHeader`, `CardContent`, `CardAction`, and `CardFooter`
- [ ] T010 [US1] Implement the metric card section wrapper in `packages/canvas/src/lib/components/dashboard/metric-card-section.svelte`
- [ ] T011 [P] [US1] Implement the page shell components in `packages/canvas/src/lib/components/dashboard/` for `SidebarShell`, `PageHeader`, and the main content shell
- [ ] T012 [P] [US1] Implement structural chart and table shell components in `packages/canvas/src/lib/components/dashboard/`
- [ ] T013 [US1] Export dashboard shell and card components from `packages/canvas/src/lib/index.ts`
- [ ] T014 [US1] Replace direct reference-package rendering on the Canvas demo page in `packages/canvas/src/routes/+page.svelte` with Canvas-owned dashboard shell and card components
- [ ] T015 [US1] Align demo data usage with the Canvas-owned dashboard slice in `packages/canvas/src/routes/dashboard-data.ts`
- [ ] T016 [US1] Verify package rendering and build flow for the MVP slice with `packages/canvas/package.json` and `packages/canvas/vite.config.ts` validation commands

**Checkpoint**: User Story 1 should now render a Canvas-owned dashboard shell that is
independently reviewable as the MVP slice.

---

## Phase 4: User Story 2 - Author with Semantic Components (Priority: P2)

**Goal**: Ensure the dashboard slice is authored through semantic Canvas components instead of
raw primitive styling at the page level.

**Independent Test**: Review the Canvas demo implementation and confirm the metric section,
dashboard shell, and shell sections are composed from semantic Canvas exports rather than
page-level raw primitive styling instructions.

### Implementation for User Story 2

- [ ] T017 [P] [US2] Introduce semantic layout wrappers for stack, inline, grid, and shell containers in `packages/canvas/src/lib/components/layout/`
- [ ] T018 [US2] Refactor dashboard shell components in `packages/canvas/src/lib/components/dashboard/` to consume semantic layout wrappers rather than ad hoc page-level primitive composition
- [ ] T019 [US2] Refactor the card family in `packages/canvas/src/lib/components/card/` to use constrained semantic props for surface, density, border, and interactive states
- [ ] T020 [US2] Update the Canvas demo page in `packages/canvas/src/routes/+page.svelte` so authored usage depends on semantic dashboard and layout components first
- [ ] T021 [US2] Update package exports and any package-facing documentation in `packages/canvas/src/lib/index.ts` and `packages/canvas/README.md` to reflect the semantic authoring surface

**Checkpoint**: User Story 2 should leave the dashboard slice authored primarily through
semantic Canvas components, with primitives acting as the substrate.

---

## Phase 5: User Story 3 - Prepare for Data-Driven Composition (Priority: P3)

**Goal**: Make the first Canvas slice a stable foundation for future JSON-driven composition.

**Independent Test**: Review the Canvas component boundaries and public exports and confirm
that a future stored-node renderer can target semantic components before falling back to
primitive views.

### Implementation for User Story 3

- [ ] T022 [P] [US3] Define semantic prop types for the first slice in `packages/canvas/src/lib/components/card/` and `packages/canvas/src/lib/components/dashboard/`
- [ ] T023 [P] [US3] Add component metadata or adapter scaffolding for future data-driven composition in `packages/canvas/src/lib/components/`
- [ ] T024 [US3] Document how semantic dashboard components map to primitive `View` usage in `packages/canvas/src/lib/base/view/docs.md` and related Canvas package docs
- [ ] T025 [US3] Ensure the public export surface in `packages/canvas/src/lib/index.ts` clearly separates primitive exports from semantic dashboard exports

**Checkpoint**: User Story 3 should leave Canvas ready for follow-up JSON-driven composition
work without requiring a redesign of the first dashboard slice.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, verification, and planning handoff support

- [ ] T026 [P] Update feature-facing usage notes in `specs/001-canvas-styling/quickstart.md` if implementation paths differ from the original plan
- [ ] T027 Run reference package validation with `packages/shadcn-svelte/package.json` prepack flow and resolve any parity-affecting regressions
- [ ] T028 Run Canvas validation with `packages/canvas/package.json` build and prepack flows and resolve remaining integration issues
- [ ] T029 [P] Review the Canvas demo visually against the supported reference slice and record any follow-up parity gaps in `specs/001-canvas-styling/plan.md` or a follow-up feature note

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 components existing, though some internal refactors can begin once the card and layout wrappers exist
- **User Story 3 (Phase 5)**: Depends on User Story 2 semantic component boundaries
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational completion and is the MVP
- **User Story 2 (P2)**: Depends on the MVP component slice from User Story 1
- **User Story 3 (P3)**: Depends on the semantic component surface from User Story 2

### Within Each User Story

- Semantic component files should exist before the demo page switches to them
- Primitive and layout wrappers should stabilize before semantic card and dashboard wrappers depend on them
- Public exports should be updated after the corresponding components exist
- Build and package verification should happen after the demo page integration is complete

### Parallel Opportunities

- T003 can run in parallel with T001-T002
- T007 can run in parallel with T006 once primitive direction is clear
- T009, T011, and T012 can run in parallel after Phase 2
- T017 and T022 can run in parallel with related component file work in their phases when they target different files
- Polish verification tasks that touch different packages can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch independent component family work together after Phase 2:
Task: "Implement the semantic card family in packages/canvas/src/lib/components/card/"
Task: "Implement the page shell components in packages/canvas/src/lib/components/dashboard/"
Task: "Implement structural chart and table shell components in packages/canvas/src/lib/components/dashboard/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Confirm the Canvas home page renders the dashboard shell with
   Canvas-owned components only

### Incremental Delivery

1. Build the primitive and semantic foundation
2. Deliver the dashboard shell MVP
3. Refine authoring so the page uses semantic components first
4. Add the public API and metadata groundwork for future JSON-driven composition

### Parallel Team Strategy

With multiple developers:

1. One developer refines the primitive/layout foundation
2. One developer builds the card family
3. One developer builds the dashboard shell wrappers
4. Integration happens on the Canvas home page after those pieces land

---

## Notes

- [P] tasks = different files, no incomplete-task dependency
- [US1], [US2], and [US3] map directly to the specification user stories
- The recommended MVP scope is User Story 1 only
- The first slice intentionally stops at shell parity for chart and table sections
- Keep the semantic-vs-primitive boundary explicit throughout implementation
