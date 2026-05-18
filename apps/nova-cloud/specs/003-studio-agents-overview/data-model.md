# Data Model: Studio Agents Overview

## Agent Record

Represents one Studio-scoped agent surfaced on the page.

### Fields

- `id`
- `name`
- `icon`
- `role`
- `source`
- `status`
- `createdAt`
- `lastActiveAt`
- `jobCount`
- `recentActivitySummary`

### Rules

- `name` MUST be present for display.
- `role` SHOULD be present; missing values should degrade gracefully.
- `status` MUST map to a known visual state.
- `source` MUST be available for filtering when present in the loaded data.
- `createdAt` and `lastActiveAt` MUST be sortable when available.

### Relationships

- Belongs to exactly one Studio.
- Can appear in one card in the agents grid.

## Agent Toolbar State

Represents the current discovery controls applied to the page.

### Fields

- `query`
- `statusFilters`
- `roleFilters`
- `sourceFilters`
- `sortKey`
- `sortDirection`

### Rules

- Search SHOULD match the visible agent list by text entry.
- Filters SHOULD be derived from the loaded agent data.
- Sort keys MUST be limited to `name`, `createdAt`, and `lastActiveAt`.
- Sort direction MUST be limited to ascending or descending.

## Agent View State

Represents the current rendering mode of the page.

### Values

- `empty`
- `populated`
- `empty-results`

### Rules

- `empty` is used when the Studio has no agents at all.
- `populated` is used when at least one agent exists and matches the current
  toolbar state.
- `empty-results` is used when search or filters remove all matches.

## Agent Grid Card

Represents the visible management card for one agent record.

### Fields

- `identity`
- `roleSubtitle`
- `statusBadge`
- `activitySummary`
- `manageHref`
- `openHref`

### Rules

- Identity MUST appear before operational metadata.
- Manage and Open are the only explicit card actions in this feature.
- Card layout MUST remain readable across responsive breakpoints.
