# Tasks: Studio Shell Marketplace Overhaul

**Input**: Design documents from `/specs/001-studio-shell-marketplace/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Targeted validation is required by the project constitution. Add or
update focused regression coverage for API contracts and shell behavior where it
provides direct confidence for this feature.

**Organization**: Tasks are grouped by user story to enable independent
implementation and validation of each slice.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish shared feature types, styling hooks, and route/component
entry points for the shell overhaul.

- [x] T001 Define shell feature types and capability identifiers in `src/lib/studios/types.ts`
- [x] T002 [P] Add shared Aura Gold shell tokens and overflow-safe layout utilities in `src/app.css`
- [x] T003 [P] Create feature scaffolding for shared Studio shell components in `src/lib/components/studios/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Durable state, server contracts, and shared shell primitives that
all user stories depend on.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [x] T004 Extend Studio persistence for `navigationProfile` and `appearanceSettings` in `src/lib/server/surreal-studios.ts`
- [x] T005 [P] Add shell preference request/response types in `src/lib/studios/types.ts`
- [x] T006 Create the server-side navigation registry and capability resolver in `src/lib/server/sidebar-state.ts`
- [x] T007 [P] Add Studio navigation persistence API in `src/routes/api/studios/[studioId]/navigation/+server.ts`
- [x] T008 [P] Add app-level search resolver and authenticated search API in `src/lib/server/app-search.ts`
- [x] T009 [P] Expose app-level search through `src/routes/api/app/search/+server.ts`
- [x] T010 Create reusable shell header, command-search, and page-section primitives in `src/lib/components/studios/`
- [x] T011 Update `src/routes/api/studios/[studioId]/+server.ts` to save Studio appearance settings alongside existing Studio fields

**Checkpoint**: Durable shell state and shared shell primitives are ready.

---

## Phase 3: User Story 1 - Navigate a Studio Shell (Priority: P1) 🎯 MVP

**Goal**: Deliver a grouped, collapsible, sticky, overflow-safe Studio shell.

**Independent Test**: Open a Studio, collapse and expand the sidebar, navigate
between grouped destinations, scroll long content pages, and confirm the shell
header stays fixed with no page-level horizontal overflow.

### Implementation for User Story 1

- [x] T012 [US1] Replace the main shell composition with the grouped `sidebar-7` structure in `src/lib/components/app-sidebar.svelte`
- [x] T013 [US1] Implement grouped section and submenu rendering with bottom-anchored Settings and Support in `src/lib/components/studios/studio-sidebar-nav.svelte`
- [x] T014 [US1] Update shell layout, sticky header behavior, and sidebar inset handling in `src/routes/(app)/app/+layout.svelte`
- [x] T015 [P] [US1] Apply shared shell/page wrappers to the Studio overview route in `src/routes/(app)/app/studios/[studioId]/+page.svelte`
- [x] T016 [P] [US1] Apply shared shell/page wrappers to the Files route in `src/routes/(app)/app/studios/[studioId]/files/+page.svelte`
- [x] T017 [P] [US1] Apply shared shell/page wrappers to runtime-oriented routes in `src/routes/(app)/app/studios/[studioId]/runtime/+page.svelte`
- [x] T018 [P] [US1] Apply shared shell/page wrappers to settings and jobs routes in `src/routes/(app)/app/studios/[studioId]/settings/+page.svelte` and `src/routes/(app)/app/studios/[studioId]/jobs/+page.svelte`
- [x] T019 [P] [US1] Apply shared shell/page wrappers to the Studio skills route in `src/routes/(app)/app/studios/[studioId]/skills/+page.svelte`

**Checkpoint**: The Studio shell is grouped, collapsible, sticky, and overflow-safe.

---

## Phase 4: User Story 2 - Personalize a Studio Workspace (Priority: P1)

**Goal**: Let users reorder navigation and manage Studio settings with durable
save/cancel behavior and finer-grained appearance controls.

**Independent Test**: Reorder the sidebar, save the new order, refresh or sign
back in, and confirm the selected Studio restores the saved state. Update
settings, save once, cancel a later draft, and confirm only saved changes
persist.

### Implementation for User Story 2

- [x] T020 [US2] Add client-side reorder state, drag/move interactions, and save/cancel actions in `src/lib/components/studios/studio-sidebar-nav.svelte`
- [x] T021 [US2] Wire sidebar persistence calls and live shell refresh in `src/lib/components/app-sidebar.svelte`
- [x] T022 [US2] Return resolved navigation preferences from `src/routes/api/app/sidebar-state/+server.ts`
- [x] T023 [US2] Apply navigation normalization and persistence updates in `src/lib/server/sidebar-state.ts`
- [x] T024 [US2] Redesign the Studio settings page into tabbed sections with shared footer actions in `src/routes/(app)/app/studios/[studioId]/settings/+page.svelte`
- [x] T025 [P] [US2] Extend Studio settings load support for appearance and navigation metadata in `src/routes/(app)/app/studios/[studioId]/settings/+page.server.ts`
- [x] T026 [US2] Apply fine-grained Studio appearance tokens in `src/routes/(app)/app/+layout.svelte` and `src/app.css`

**Checkpoint**: Studio personalization persists durably and settings use a modern save/cancel workflow.

---

## Phase 5: User Story 3 - Manage Studio Capabilities (Priority: P2)

**Goal**: Surface Content, Integrations, Deployments, Sandbox, and related
Studio capabilities through coherent grouped destinations.

**Independent Test**: Open a Studio with files, integrations, and workspace
activity, navigate the grouped shell, open the marketplace entry, and confirm
capability destinations are clearly separated and correctly labeled.

### Implementation for User Story 3

- [x] T027 [US3] Add Content section summaries and explicit `2 GB` free storage allowance handling in `src/lib/server/sidebar-state.ts`
- [x] T028 [P] [US3] Update the Files page header and content summary to reflect the Content section model in `src/routes/(app)/app/studios/[studioId]/files/+page.svelte`
- [x] T029 [US3] Add the Integrations section header `+` action plus installed capability and sub-item rendering in `src/lib/components/studios/studio-sidebar-nav.svelte`
- [x] T030 [P] [US3] Create the initial marketplace page in `src/routes/(app)/app/studios/[studioId]/marketplace/+page.svelte`
- [x] T031 [P] [US3] Add marketplace page data loading in `src/routes/(app)/app/studios/[studioId]/marketplace/+page.server.ts`
- [x] T032 [P] [US3] Create the deployments management route in `src/routes/(app)/app/studios/[studioId]/deployments/+page.svelte`
- [x] T033 [P] [US3] Add deployments page data loading in `src/routes/(app)/app/studios/[studioId]/deployments/+page.server.ts`
- [x] T034 [P] [US3] Create the sandbox management route in `src/routes/(app)/app/studios/[studioId]/sandbox/+page.svelte`
- [x] T035 [P] [US3] Add sandbox page data loading in `src/routes/(app)/app/studios/[studioId]/sandbox/+page.server.ts`
- [x] T036 [P] [US3] Create agent management and memory route shells in `src/routes/(app)/app/studios/[studioId]/agents/+page.svelte` and `src/routes/(app)/app/studios/[studioId]/memory/+page.svelte`
- [x] T037 [P] [US3] Create integration detail pages in `src/routes/(app)/app/studios/[studioId]/integrations/[integrationKey]/+page.svelte` and `src/routes/(app)/app/studios/[studioId]/integrations/[integrationKey]/+page.server.ts`
- [x] T038 [US3] Align Studio capability naming and route resolution across `src/lib/server/sidebar-state.ts`, `src/lib/server/studio-overview-state.ts`, and `src/lib/integrations/catalog.ts`

**Checkpoint**: Studio capability areas are clearly separated and reachable from the shell.

---

## Phase 6: User Story 4 - Search and Account Access from Anywhere (Priority: P3)

**Goal**: Provide a shell-wide search surface and live sidebar account footer.

**Independent Test**: Open shell search, navigate from a search result, then
open the sidebar footer and confirm live account data and account actions appear.

### Implementation for User Story 4

- [x] T039 [US4] Build the command-style shell search component in `src/lib/components/studios/studio-global-search.svelte`
- [x] T040 [US4] Integrate the shell search entry below the logo in `src/lib/components/app-sidebar.svelte`
- [x] T041 [US4] Connect shell search result navigation and Studio context switching in `src/routes/(app)/app/+layout.svelte`
- [x] T042 [US4] Replace placeholder sidebar footer identity and actions in `src/lib/components/nav-user.svelte`
- [x] T043 [US4] Return live authenticated user footer data from `src/lib/server/sidebar-state.ts`

**Checkpoint**: Users can search from the shell and see live account data in the sidebar footer.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Add confidence, refine consistency, and complete release validation.

- [x] T044 [P] Add API regression coverage for Studio navigation persistence and shell search in `tests/studio-shell-api.test.ts`
- [x] T045 [P] Add UI regression coverage for collapse, sticky header, and overflow behavior in `tests/studio-shell-layout.test.ts`
- [x] T046 [P] Update supporting Studio shell guidance in `AGENTS.md` and `README.md`
- [ ] T047 Run the manual validation flow in `specs/001-studio-shell-marketplace/quickstart.md`
- [x] T048 Run `vp check` and `vp test`, then fix remaining issues in touched files under `src/` and `tests/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories
- **User Story 1 (Phase 3)**: Starts after Foundational completion
- **User Story 2 (Phase 4)**: Starts after Foundational completion, but benefits from the shell structure from US1
- **User Story 3 (Phase 5)**: Starts after Foundational completion and can follow the base shell work from US1
- **User Story 4 (Phase 6)**: Starts after Foundational completion and integrates into the shell from US1
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1** is the MVP and should land first.
- **US2** depends on the durable shell and layout foundation but should remain independently testable once added.
- **US3** depends on the shell grouping model and existing Studio capability data.
- **US4** depends on foundational search contracts and the shell header/sidebar integration from US1.

### Within Each User Story

- Durable data and API changes precede UI persistence wiring.
- Shared shell layout and primitives precede route-by-route visual convergence.
- New route shells precede deeper capability-specific enhancements.
- Validation tasks run after the corresponding story slice is functionally complete.

### Parallel Opportunities

- T002 and T003 can run in parallel.
- T005, T007, T008, T009, and T011 can run in parallel after T004.
- T015 through T019 can run in parallel once T012 through T014 establish the base shell.
- T025 can run in parallel with T024 after the persistence contract is in place.
- T028 through T037 contain several route-specific parallel opportunities because they touch separate destinations.
- T044, T045, and T046 can run in parallel during polish.

## Parallel Example: User Story 3

```bash
Task: "Create the initial marketplace page in src/routes/(app)/app/studios/[studioId]/marketplace/+page.svelte"
Task: "Create the deployments management route in src/routes/(app)/app/studios/[studioId]/deployments/+page.svelte"
Task: "Create the sandbox management route in src/routes/(app)/app/studios/[studioId]/sandbox/+page.svelte"
Task: "Create agent management and memory route shells in src/routes/(app)/app/studios/[studioId]/agents/+page.svelte and src/routes/(app)/app/studios/[studioId]/memory/+page.svelte"
```

## Implementation Strategy

### MVP First

1. Complete Setup
2. Complete Foundational work
3. Complete User Story 1
4. Validate the grouped shell, sticky header, and overflow fixes before moving on

### Incremental Delivery

1. Add US1 to establish the new shell
2. Add US2 to make the shell personal and durable
3. Add US3 to complete capability destinations and marketplace entry
4. Add US4 to complete search and live account access
5. Finish with cross-cutting validation and documentation

### Team Parallelism

With multiple implementers:

1. One owner handles durable state and API contracts
2. One owner handles shell/sidebar composition and layout convergence
3. One owner handles new capability routes and marketplace entry
4. One owner handles search/footer integration and regression coverage

## Notes

- `[P]` tasks are limited to work that can proceed on different files without
  blocking unfinished dependencies.
- The task list assumes the current Studio/file/runtime/integration foundations
  remain in place and are being reorganized rather than replaced.
- If implementation reveals a missing destination is too incomplete for full
  delivery, ship the route shell and consistent shell integration first, then
  expand the destination in a follow-up feature.
