# Implementation Plan: Studio Agents Overview

**Branch**: `003-studio-agents-overview` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/003-studio-agents-overview/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See
`.specify/templates/plan-template.md` for the execution workflow.

## Summary

Rework the Studio agents page into a modern management overview with two clear
modes: a landing-style empty state for first-time setup and a responsive,
identity-first card grid for one or many agents. Add a sticky toolbar for
search, filtering, and sorting so the page stays usable as the agent list
grows.

## Technical Context

**Language/Version**: TypeScript 5.9, Svelte 5, SvelteKit 2.x  
**Primary Dependencies**: Vite+, `@sveltejs/kit`, `svelte`, existing Nova Cloud
studio shell components, `lucide-svelte`, `svelte-sonner`, shadcn/bits-style UI
primitives, SurrealDB-backed app data  
**Storage**: Existing SurrealDB studio data and the current Studio overview and
agent-related records  
**Testing**: `vp check`, `vp test`, targeted page validation in browser, and
feature-specific manual checks for empty, populated, and no-results states  
**Target Platform**: Responsive authenticated web app for desktop and mobile  
**Project Type**: SvelteKit web application  
**Performance Goals**: Search/filter/sort should feel immediate on the loaded
agent set, and the toolbar/grid should remain responsive on mobile and desktop  
**Constraints**: Must preserve the existing Studio shell, keep the empty state
action-oriented, present pricing neutrally, keep bring-your-own-agent as a
first-class option, and derive filters from available agent data  
**Scale/Scope**: One Studio-scoped agents page, one sticky toolbar, one
responsive agent card grid, and one empty-state onboarding surface

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Studio-first semantics**: PASS. The page is scoped to one Studio and uses
  Studio-centered language and navigation.
- **State-driven page design**: PASS. The feature is explicitly split into
  empty, populated, and no-results states.
- **Action-first copy and transparent economics**: PASS. The empty state leads
  with action and keeps credits/BYO guidance secondary but visible.
- **Data-driven controls and surface discovery**: PASS. Search, filters, and
  sort are derived from agent records rather than hardcoded copy.
- **Modern Svelte implementation and accessibility**: PASS. The design remains
  within the existing Svelte 5 + Vite+ stack and requires responsive,
  keyboard-usable controls.

## Project Structure

### Documentation (this feature)

```text
specs/003-studio-agents-overview/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── spec.md
```

### Source Code (repository root)

```text
apps/nova-cloud/src/routes/(app)/app/studios/[studioId]/agents/
├── +page.svelte
└── +page.server.ts

apps/nova-cloud/src/lib/components/studios/
├── agent-card.svelte
└── agents-toolbar.svelte

apps/nova-cloud/src/lib/server/
└── studio-agents.ts
```

**Structure Decision**: Keep the work inside the existing Nova Cloud SvelteKit
app. The route owns the page state, shared Studio components own the card and
toolbar presentation, and a small server helper can centralize agent shaping and
filter metadata if needed.

## Complexity Tracking

No constitution violations currently require justification.

## Phase 0: Research

Research is limited to implementation details that affect the page shape:

- confirm the page can reuse loaded agent data for search/filter/sort in v1
- confirm the sticky toolbar fits the current Studio page shell without layout
  regressions
- confirm the empty state can stay action-oriented while keeping pricing and
  bring-your-own-agent copy neutral

## Phase 1: Design

The design should define:

- the agent record shape used by the page
- the toolbar state needed for search, filter, and sort
- the responsive card grid behavior
- the empty, populated, and no-results state treatment

## Phase 2: Implementation Strategy

### Workstream A: Empty-state onboarding

- design the landing-style empty state for no-agent Studios
- include create-agent and bring-your-own-agent entry points
- add short pricing/credits education below the primary actions

### Workstream B: Populated grid

- render agent cards in a responsive grid
- show icon, name, role, status, and activity summary in that order
- keep Manage and Open as the only card actions

### Workstream C: Discovery toolbar

- add sticky search, filter, and sort controls
- support status, role, and source facets
- support name, creation date, and recently active sorting in both directions

### Workstream D: Edge states and validation

- handle empty results cleanly
- preserve mobile readability and desktop density
- verify the page works with one agent and many agents

## Phase 3: Validation Strategy

Validation should confirm:

- the empty state is the only landing hero when no agents exist
- the populated state removes the hero and shows the grid plus toolbar
- search, filtering, and sorting update the visible cards correctly
- the toolbar remains sticky during long scroll sessions
- no horizontal overflow appears on mobile or desktop
