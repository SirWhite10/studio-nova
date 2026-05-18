# Tasks: Studio Agents Overview

**Input**: Design documents from `/specs/003-studio-agents-overview/`
**Prerequisites**: plan.md (required), spec.md (required for user stories),
research.md, data-model.md, quickstart.md

**Tests**: No formal automated tests were requested for this feature. Validation
tasks are included in the final phase.

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task belongs to, e.g. [US1]
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the shared data and contract shape for the agents page

- [ ] T001 [P] Define the Studio agent record, filter state, and view-state types in `apps/nova-cloud/src/lib/studios/types.ts`
- [ ] T002 [P] Create agent shaping and search/filter/sort helpers in `apps/nova-cloud/src/lib/server/studio-agents.ts`
- [ ] T003 Update `apps/nova-cloud/src/routes/(app)/app/studios/[studioId]/agents/+page.server.ts` to load the agent payload and expose toolbar facet metadata

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared UI shells that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [P] Create the reusable agent card shell in `apps/nova-cloud/src/lib/components/studios/agent-card.svelte`
- [ ] T005 [P] Create the reusable sticky agents toolbar shell in `apps/nova-cloud/src/lib/components/studios/agents-toolbar.svelte`
- [ ] T006 [P] Create the agent creation wizard shell in `apps/nova-cloud/src/lib/components/studios/agent-create-dialog.svelte`

**Checkpoint**: Foundation ready - user story implementation can now begin in
parallel

---

## Phase 3: User Story 1 - Empty State Onboarding (Priority: P1) 🎯 MVP

**Goal**: Give Studio users with no agents a landing-style entry point that
drives action first and keeps education secondary.

**Independent Test**: Open the Studio agents page with no agents and confirm
the page shows a create-agent CTA, a bring-your-own-agent CTA, and short
pricing/credits education below the primary actions.

### Implementation for User Story 1

- [ ] T007 [P] [US1] Create the empty-state landing component in `apps/nova-cloud/src/lib/components/studios/agents-empty-state.svelte` with the hero copy, create CTA, BYO CTA, and pricing note
- [ ] T008 [US1] Replace the legacy harness-focused hero in `apps/nova-cloud/src/routes/(app)/app/studios/[studioId]/agents/+page.svelte` with the empty-state component when the Studio has no agents
- [ ] T009 [US1] Wire the create-agent CTA in `apps/nova-cloud/src/routes/(app)/app/studios/[studioId]/agents/+page.svelte` to open `apps/nova-cloud/src/lib/components/studios/agent-create-dialog.svelte` and keep the bring-your-own-agent action descriptive and neutral

**Checkpoint**: At this point, Studio users with no agents should see a clear
landing-style entry surface

---

## Phase 4: User Story 2 - Populated Agent Grid (Priority: P1)

**Goal**: Show one or many agents as a modern responsive card grid with
identity-first cards and concise operational context.

**Independent Test**: Open the Studio agents page with one agent and then with
multiple agents, and confirm the same card-based grid appears with icon, name,
role, status, activity, and Manage/Open actions.

### Implementation for User Story 2

- [ ] T010 [P] [US2] Populate `apps/nova-cloud/src/lib/components/studios/agent-card.svelte` with icon, name, role subtitle, status badge, activity summary, and Manage/Open actions
- [ ] T011 [US2] Replace the legacy harness cards in `apps/nova-cloud/src/routes/(app)/app/studios/[studioId]/agents/+page.svelte` with a responsive grid driven by the loaded agent list
- [ ] T012 [US2] Add the single-agent and multi-agent rendering path in `apps/nova-cloud/src/routes/(app)/app/studios/[studioId]/agents/+page.svelte` so the page uses the same grid model for one or many agents

**Checkpoint**: At this point, the populated page should read like a modern
management overview instead of a descriptive harness page

---

## Phase 5: User Story 3 - Search, Filter, and Sort (Priority: P2)

**Goal**: Keep discovery controls visible and sticky so users can search,
filter, and sort large agent lists without losing their place.

**Independent Test**: Open a populated agents page, use search and the status,
role, and source filters, then change the sort order to confirm the visible
cards update correctly while the toolbar stays sticky.

### Implementation for User Story 3

- [ ] T013 [P] [US3] Build the sticky discovery controls in `apps/nova-cloud/src/lib/components/studios/agents-toolbar.svelte` with search, status, role, source, and sort inputs
- [ ] T014 [US3] Connect toolbar state in `apps/nova-cloud/src/routes/(app)/app/studios/[studioId]/agents/+page.svelte` to the filtered and sorted agent list, including name, creation date, and recently active ordering in both directions
- [ ] T015 [US3] Add the empty-results state and sticky-toolbar spacing behavior in `apps/nova-cloud/src/routes/(app)/app/studios/[studioId]/agents/+page.svelte` so no-match states remain clear on desktop and mobile

**Checkpoint**: At this point, the page should stay usable for long lists and
large filter combinations

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the end-to-end flow and clean up any regressions

- [ ] T016 [P] Validate the empty, single-agent, multi-agent, and no-results flows against `apps/nova-cloud/specs/003-studio-agents-overview/quickstart.md`
- [ ] T017 Run `vp check` and `vp test` from `apps/nova-cloud` and fix any formatting, lint, type, or test regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user
  stories
- **User Stories (Phase 3+)**: Depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on completion of the desired user stories

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational phase completion
- **User Story 2 (P1)**: Can start after Foundational phase completion and can
  be implemented alongside US1 once the shared shells exist
- **User Story 3 (P2)**: Can start after the shared shells and page state model
  are in place

### Within Each User Story

- Shared data and type shapes before UI composition
- UI shells before page integration
- Page integration before polish
- Keep empty, populated, and no-results states independently understandable

### Parallel Opportunities

- T001 and T002 can run in parallel because they touch different files
- T004, T005, and T006 can run in parallel because they are separate component
  shells
- T007 can run in parallel with T010 once the shared shells exist
- T016 can run after the implementation tasks are complete and does not depend
  on other polish work

## Parallel Example: User Story 1

```bash
Task: "Create the empty-state landing component in
apps/nova-cloud/src/lib/components/studios/agents-empty-state.svelte"
Task: "Populate apps/nova-cloud/src/lib/components/studios/agent-create-dialog.svelte
with the wizard shell"
```

## Parallel Example: User Story 2

```bash
Task: "Populate apps/nova-cloud/src/lib/components/studios/agent-card.svelte"
Task: "Replace the legacy harness cards in
apps/nova-cloud/src/routes/(app)/app/studios/[studioId]/agents/+page.svelte
with a responsive grid"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Confirm the empty-state landing experience is clear
5. If ready, continue with the populated grid and discovery controls

### Incremental Delivery

1. Complete Setup + Foundational
2. Deliver User Story 1 for the empty state
3. Deliver User Story 2 for the populated grid
4. Deliver User Story 3 for the sticky search/filter/sort toolbar
5. Finish with validation and regression checks

### Parallel Team Strategy

With multiple developers:

1. One developer can prepare the shared types and helpers while another builds
   the component shells
2. After the foundations are ready, one developer can finish the empty state
   while another builds the populated grid
3. The toolbar can then be implemented and wired without changing the empty
   state behavior

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to a specific user story for traceability
- Each user story should be independently completable and testable
- Verify the empty-state, populated-state, and no-results behavior before
  calling the feature complete
