# Data Model: Studio Shell Marketplace Overhaul

## Studio

- **Purpose**: Existing top-level Studio product entity extended with shell and
  appearance preferences.
- **Key fields**:
  - `id`
  - `userId`
  - `name`
  - `description`
  - `purpose`
  - `icon`
  - `color`
  - `themeHue`
  - `lastOpenedAt`
  - `navigationProfile`
  - `appearanceSettings`
  - `updatedAt`
- **Validation rules**:
  - Only the Studio owner may mutate Studio shell preferences.
  - `navigationProfile` must only reference recognized section and item keys.
  - Unknown or unavailable items are ignored during resolution and replaced by
    default ordering.

## Studio Navigation Profile

- **Purpose**: Durable per-Studio shell configuration controlling how the sidebar
  is arranged.
- **Key fields**:
  - `version`
  - `sectionOrder`: ordered list of top-level section ids
  - `sectionConfigs`: map of section id to per-section preferences
  - `updatedAt`
- **Validation rules**:
  - Required top-level sections remain bounded to the approved shell model.
  - Section ids must be unique.
  - Missing required sections are restored from defaults on read or save.

## Navigation Section Config

- **Purpose**: Stored preferences for a single top-level Studio navigation
  section.
- **Key fields**:
  - `id`: one of `agent`, `workspace-sandbox`, `integrations`, `content`
  - `itemOrder`: ordered list of child item ids
  - `collapsed`: optional preference for section-level presentation
  - `updatedAt`
- **Validation rules**:
  - Child item ids must be unique within a section.
  - System-reserved or unavailable items are removed during normalization.

## Navigation Item

- **Purpose**: Resolved user-facing destination shown in the sidebar.
- **Key fields**:
  - `id`
  - `sectionId`
  - `title`
  - `href`
  - `icon`
  - `kind`: `page`, `integration`, `content`, `workspace`, `system`
  - `reorderable`
  - `children`
  - `availability`
- **Validation rules**:
  - `href` must resolve to a valid authenticated app destination.
  - Child items inherit the same Studio ownership context as the selected
    Studio.

## Studio Capability

- **Purpose**: Derived view of what a Studio currently supports and what the
  shell should expose.
- **Derived from**:
  - installed integrations
  - files/content availability
  - runtime/workspace/deployment records
  - jobs, memory, and agent-related surfaces
- **Key fields**:
  - `key`
  - `title`
  - `enabled`
  - `sectionId`
  - `destinations`
  - `statusLabel`

## Studio Appearance Settings

- **Purpose**: Durable Studio-level visual customization settings.
- **Key fields**:
  - `themeHue`
  - `accentScale`
  - `surfaceMode`
  - `brandContrast`
  - `updatedAt`
- **Validation rules**:
  - Saved values must remain inside the supported Nova theme token ranges.
  - Invalid values fall back to the Studio default appearance.

## Content Allocation Summary

- **Purpose**: Product-facing storage allowance and usage information shown in
  the Content area.
- **Key fields**:
  - `includedBytes`
  - `usedBytes`
  - `remainingBytes`
  - `displayLabel`
- **Validation rules**:
  - `includedBytes` is fixed to the current free allowance for this release.
  - `usedBytes` must be derived from authoritative file/storage records.

## Global Search Query

- **Purpose**: Request model for app-shell search.
- **Key fields**:
  - `query`
  - `selectedStudioId`
  - `limit`
  - `resultTypes`
- **Validation rules**:
  - Empty or whitespace-only queries do not trigger ranked result responses.
  - Search results must be scoped to resources the current user can access.

## Search Result

- **Purpose**: Unified result object for shell search.
- **Key fields**:
  - `id`
  - `type`
  - `title`
  - `subtitle`
  - `href`
  - `section`
  - `studioId`
  - `priority`
- **Validation rules**:
  - Results must link to valid app destinations.
  - Results tied to a Studio include that Studio context so the shell can switch
    context correctly when needed.

## State Transitions

### Navigation Profile

- `default` -> `edited`
- `edited` -> `saved`
- `saved` -> `resolved`
- `resolved` -> `normalized fallback` when invalid or unavailable items are detected

### Appearance Settings

- `current` -> `draft`
- `draft` -> `saved`
- `draft` -> `discarded`

### Search Interaction

- `idle` -> `querying`
- `querying` -> `results`
- `querying` -> `empty`
- `querying` -> `error`
