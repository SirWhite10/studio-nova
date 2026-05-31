# Feature Specification: Canvas Editor Rebuild

**Feature Branch**: `004-canvas-editor-rebuild`
**Created**: 2026-05-20
**Status**: Draft
**Input**: "Rebuild the canvas editor to achieve 100% visual parity with Puck using Svelte 5 + View primitives + inline styles (zero Tailwind at runtime). The shadcn-components/ui/ directory is the visual reference; view-ui/ is the canonical runtime layer."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Editor Compiles Without Tailwind (Priority: P1)

A developer can start the canvas package and the editor renders fully with zero runtime imports from `shadcn-components/`. All editor fields, sidebar, canvas surface, and dialogs use `view-ui/` components exclusively.

**Why this priority**: This is the foundational unblock. Until the editor compiles and renders with only View-based components, no further visual fidelity work matters.

**Independent Test**: Start the canvas dev server, open the editor, and verify no 404s or import errors from `shadcn-components/`. All field editors (text, number, boolean, select, color, spacing, array, object, image, icon, link, rich text) render in the inspector.

**Acceptance Scenarios**:

1. **Given** the canvas package is started, **When** the editor opens, **Then** no imports resolve from `shadcn-components/` and all editor UI comes from `view-ui/` or `base/`.
2. **Given** a component is selected on the canvas, **When** the inspector renders, **Then** all field types (text, textarea, number, select, boolean, color, spacing, array, object, image, icon, link, rich text) render using view-ui components.

---

### User Story 2 - View-UI Components Match shadcn Visual Fidelity (Priority: P2)

A developer can compare any view-ui component side-by-side with its shadcn counterpart and see matching visual output: same spacing, colors, borders, shadows, focus rings, disabled states, and transitions.

**Why this priority**: Visual parity is the product requirement. The shadcn components define "correct" — view-ui must replicate that.

**Independent Test**: Create a comparison page rendering each view-ui component next to its shadcn equivalent. Verify: padding, margins, border-radius, background colors, text colors, shadow, focus-visible rings, disabled opacity, hover states, and active states match.

**Acceptance Scenarios**:

1. **Given** a view-ui button, **When** compared side-by-side with the shadcn button, **Then** all 6 variants (default, outline, secondary, ghost, destructive, link) and 8 sizes match in spacing, color, and interaction states.
2. **Given** any interactive view-ui component, **When** focused via keyboard, **Then** a focus-visible ring appears matching shadcn's `border-ring ring-ring/50 ring-[3px]` pattern.
3. **Given** any interactive view-ui component, **When** disabled, **Then** it shows `opacity: 0.5` and `pointer-events: none`.

---

### User Story 3 - Editor Shell Matches Puck Layout (Priority: P3)

A developer can open the Canvas editor and see the same layout structure as Puck: header bar with title/toggles/actions, left sidebar with component palette and outline, center canvas with viewport controls and zoom, right sidebar with field inspector.

**Why this priority**: This is the end-user-facing product experience. The internal architecture is solid — the visual shell needs to match Puck's proven UX.

**Independent Test**: Open Puck's editor demo and Canvas editor side-by-side. Verify the same panel layout, same visual hierarchy, same interactive patterns (component drag, selection overlay, action bar, layer tree).

**Acceptance Scenarios**:

1. **Given** the Canvas editor is opened, **When** viewed alongside Puck, **Then** the layout matches: header → nav rail → left sidebar → canvas → right sidebar.
2. **Given** a component on the canvas, **When** clicked, **Then** a selection overlay appears with an action bar showing the component label and action buttons.
3. **Given** the component palette in the left sidebar, **When** a component is dragged to the canvas, **Then** it inserts at the drop position with a visual preview.

---

### User Story 4 - AI Agent Can Build Pages via the Editor (Priority: P4)

An AI agent (from nova-cloud) can programmatically construct and modify pages using the editor's data model and component registry, producing complete pages/portals for end customers.

**Why this priority**: This is the business value — DLX Studios exists so AI agents can build websites. The editor must support programmatic page construction.

**Independent Test**: Using the editor store API, construct a page with a hero, text blocks, and a card grid. Verify the serialized JSON is valid and re-renders identically.

**Acceptance Scenarios**:

1. **Given** the component catalog, **When** an AI agent inserts components via the store API, **Then** the canvas renders the resulting page without manual interaction.
2. **Given** a page built by an AI agent, **When** a human opens it in the editor, **Then** all components are selectable, editable, and movable.

### Edge Cases

- What happens when a view-ui component needs a pseudo-element effect (e.g., `after:border` on avatar)?
- How do you handle shadcn's `data-[state=on]` attribute styling without Tailwind's data-attribute selectors?
- What happens when a component needs CSS animation (e.g., dialog fade-in) without Tailwind's `animate-in` utility?
- How does the editor handle components that don't exist in the registry (graceful fallback)?
- What happens when the canvas is resized and the viewport auto-zoom kicks in?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The canvas editor MUST compile and render with zero runtime imports from `shadcn-components/`.
- **FR-002**: All view-ui components MUST visually match their shadcn counterparts in default, hover, focus, active, and disabled states.
- **FR-003**: The editor MUST provide 6 missing view-ui components (input, textarea, checkbox, switch, progress, accordion) that the editor fields already import.
- **FR-004**: The editor MUST provide dialog and command view-ui components for settings and pages dialogs.
- **FR-005**: All view-ui components MUST use `<View>` internally for layout and styling, producing inline CSS only.
- **FR-006**: No component in `view-ui/` MAY contain Tailwind classes in its rendered output.
- **FR-007**: All interactive view-ui components MUST support focus-visible rings matching shadcn's pattern.
- **FR-008**: All interactive view-ui components MUST support disabled state with `opacity: 0.5` and `pointer-events: none`.
- **FR-009**: All view-ui components MUST use theme tokens (`canvasTheme.colors.*`) instead of hardcoded colors.
- **FR-010**: The editor shell layout MUST match Puck's CSS grid layout: header, nav, left sidebar, canvas, right sidebar.
- **FR-011**: The editor MUST support component selection with visual overlay and action bar.
- **FR-012**: The editor MUST support drag-and-drop component insertion from the component palette.
- **FR-013**: The editor MUST expose a programmatic API (via store) for AI agents to construct pages.
- **FR-014**: The `shadcn-components/` directory MUST remain in the codebase as a visual reference only — never imported at runtime.

### Key Entities

- **View-UI Component**: A data-driven Svelte component using `<View>` for all layout, accepting serializable props, producing inline CSS. The canonical runtime component layer.
- **shadcn Reference Component**: A Tailwind-based component in `shadcn-components/ui/` that serves as the visual specification for its view-ui counterpart.
- **Editor Store**: The Svelte 5 reactive store managing component tree, selection, history, and CRUD operations.
- **Component Registry**: A `SvelteMap` mapping component type strings to their Svelte component implementations and editor configs.
- **Canvas Node**: The serializable data model for a rendered component: `{ type, props, children, slots, id }`.
- **Editor Config**: Schema-driven field definitions for a component, controlling what appears in the inspector.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `grep -r "shadcn-components" packages/canvas/src/lib/base/ packages/canvas/src/lib/components/view-ui/` returns zero results.
- **SC-002**: Every view-ui component renders within ±2px of its shadcn counterpart for padding, margin, border-radius, width, and height.
- **SC-003**: All 13 existing + 6 new + 2 dialog/command view-ui components pass visual comparison testing.
- **SC-004**: The editor shell renders with Puck's 5-region CSS grid layout (header, nav, left, center, right).
- **SC-005**: An AI agent can construct a multi-component page via the store API and serialize it to valid JSON.

## Assumptions

- The `shadcn-components/` directory will remain frozen as a visual reference and will not receive further updates.
- The existing `View` primitive (`base/view/`) is stable and does not need architectural changes.
- The existing editor store (`base/editor/store.ts`) is stable and does not need architectural changes.
- The existing field system (`base/editor/fields/`) is stable and only needs its imports fixed.
- Puck's visual design is the target — Canvas does not need to innovate on UX, only replicate it in Svelte.
- CSS animations will be handled via `<style>` blocks with `@keyframes` rather than Tailwind's animate utilities.
- The `canvasTheme` token system is the source of truth for all colors, shadows, and radii.
