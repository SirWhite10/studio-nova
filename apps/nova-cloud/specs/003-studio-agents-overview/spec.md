# Feature Specification: Studio Agents Overview

**Feature Branch**: `003-studio-agents-overview`  
**Created**: 2026-05-10  
**Status**: Draft  
**Input**: User description: "Rework the Nova Cloud Studio agents page into a modern management overview with an action-oriented empty state, a responsive card grid for one or many agents, identity-first cards, a sticky toolbar with search/filter/sort, and neutral education about credits and bring-your-own-agent options."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Start from an empty state (Priority: P1)

As a Studio user with no agents, I want a landing-style empty state that helps
me get started quickly so I can create an agent or connect my own option
without reading a long explanation first.

**Why this priority**: The empty state is the first thing new or inactive users
see. It must convert confusion into a clear next step while still giving enough
context to understand what agents are for.

**Independent Test**: Open the Studio agents page with no agents available and
confirm the page shows a focused action area, a create-agent CTA, a bring-your-
own-agent CTA, and short educational copy below the actions.

**Acceptance Scenarios**:

1. **Given** the Studio has no agents, **When** the user opens the agents page,
   **Then** they see a landing-style empty state with a primary create-agent
   action.
2. **Given** the Studio has no agents, **When** the user reviews the page,
   **Then** they see a secondary bring-your-own-agent option and a brief note
   explaining that Nova-managed agents use credits.
3. **Given** the Studio has no agents, **When** the user interacts with the
   empty state, **Then** the page keeps the educational content secondary to the
   action path.

---

### User Story 2 - Browse agents in a responsive grid (Priority: P1)

As a Studio user with one or more agents, I want the page to present them in a
clean grid of cards so I can understand identity, status, and activity at a
glance.

**Why this priority**: The populated view is the core management experience.
Users need a quick scan of what exists, what is running, and what needs action.

**Independent Test**: Open the Studio agents page with one agent and then with
multiple agents, and confirm the same card-based grid appears with identity-
first cards, operational state, and the Manage/Open actions.

**Acceptance Scenarios**:

1. **Given** the Studio has one or more agents, **When** the page loads, **Then**
   the agents are displayed as cards in a responsive grid.
2. **Given** an agent card is visible, **When** the user reads it, **Then** the
   icon and name appear first and the role appears as the subtitle.
3. **Given** an agent card is visible, **When** the user inspects it, **Then**
   the card shows the agent's status and activity details such as job count or
   recent activity.
4. **Given** an agent card is visible, **When** the user chooses an action,
   **Then** the card offers Manage and Open actions and no extra action clutter.
5. **Given** the page is viewed on small, large, and very large screens, **When**
   the cards render, **Then** the layout adapts from one column to two columns
   and then three columns without breaking readability.

---

### User Story 3 - Search, filter, and sort agents (Priority: P2)

As a Studio user with many agents, I want a sticky toolbar with search, filters,
and sorting so I can find and organize agents without scrolling back to the top.

**Why this priority**: Discovery and organization matter most once the list
grows. The toolbar must stay accessible for mobile and desktop users who need it
repeatedly.

**Independent Test**: Open a populated agents page, use search, apply status,
role, and source filters, and change the sort order to confirm the visible grid
updates correctly while the toolbar stays sticky.

**Acceptance Scenarios**:

1. **Given** the Studio has multiple agents, **When** the user scrolls the page,
   **Then** the toolbar remains sticky at the top of the agents content area.
2. **Given** the user enters a search term, **When** the page updates, **Then**
   the visible cards are filtered to matching agents.
3. **Given** the user applies status, role, or source filters, **When** the page
   updates, **Then** only matching agents remain visible.
4. **Given** the user changes the sort control, **When** the page updates, **Then**
   the list can be ordered by name, creation date, or recently active in either
   ascending or descending order.
5. **Given** the current filter set returns no matches, **When** the page updates,
   **Then** the user sees a clear empty-results state instead of a broken grid.

### Edge Cases

- What happens when the Studio has exactly one agent?
- What happens when an agent is missing some metadata such as role, source, or
  recent activity?
- What happens when the search term matches no agents?
- What happens when filters are combined to produce zero results?
- What happens when agent names are long or wrap on smaller screens?
- What happens when the user opens the page on mobile and scrolls through many
  agents?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The agents page MUST show an action-oriented empty state when no
  agents exist for the selected Studio.
- **FR-002**: The empty state MUST include a primary create-agent action and a
  secondary bring-your-own-agent action.
- **FR-003**: The empty state MUST include brief educational copy that explains
  Nova-managed agents use credits and that a user may bring their own agent or
  agent subscription.
- **FR-004**: The populated agents page MUST present agents as responsive cards
  in a grid that adapts to screen size.
- **FR-005**: Each agent card MUST display the agent identity first, with icon
  and name before the role subtitle.
- **FR-006**: Each agent card MUST surface the agent's current status and recent
  activity summary, including job or run context when available.
- **FR-007**: Each agent card MUST provide Manage and Open actions and MUST not
  introduce additional card actions in this feature.
- **FR-008**: The populated agents page MUST include a sticky toolbar at the top
  of the agents content area.
- **FR-009**: The toolbar MUST support text search across the loaded agent list.
- **FR-010**: The toolbar MUST support filtering by status, role, and source.
- **FR-011**: The toolbar MUST support sorting by name, creation date, and
  recently active, each in ascending and descending order.
- **FR-012**: When search or filters remove all matches, the page MUST show a
  clear empty-results state.
- **FR-013**: The page MUST keep the empty-state education separate from the
  populated-state grid so the landing copy does not clutter the management view.
- **FR-014**: The feature MUST work across mobile and desktop layouts without
  losing the sticky toolbar or card readability.

### Key Entities _(include if feature involves data)_

- **Agent Record**: A Studio-scoped agent entry with identity, role, source,
  status, creation time, last active time, and job or run summary fields.
- **Agent Filter State**: The current search string, active filters, and sort
  selection used to narrow the visible agents.
- **Agent Card**: The UI representation of one agent record in the grid.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A new user can identify the create-agent path from the empty state
  within 5 seconds of landing on the page in usability review.
- **SC-002**: A user can find a specific agent in a populated Studio list using
  search and filters without leaving the page.
- **SC-003**: The populated page remains readable and navigable on mobile,
  tablet, and desktop widths without horizontal overflow.
- **SC-004**: The toolbar remains available during long scrolling sessions so
  users do not need to return to the top to change search, filters, or sorting.
- **SC-005**: The page communicates the credit and bring-your-own-agent options
  clearly enough that users understand there is more than one path to using
  agents.

## Assumptions

- The selected Studio already exposes agent records with at least identity,
  role, source, status, created-at, and last-active metadata.
- The create-agent flow will be handled by a separate wizard and this feature
  only needs to surface the entry point.
- The bring-your-own-agent path may point to a future or separate setup flow,
  but this page still needs to present it as a first-class option.
- Search, filtering, and sorting operate on the loaded agent data available to
  the page rather than requiring any new search subsystem for v1.
