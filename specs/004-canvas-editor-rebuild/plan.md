# Canvas Editor Rebuild Plan

## Goal

Rebuild the canvas editor to achieve **100% visual parity with Puck** using Svelte 5 + View primitives + inline styles (zero Tailwind at runtime). The `shadcn-components/ui/` directory serves as the visual reference — each component's Tailwind classes define what the View-based version must replicate.

## Current State (Post-Audit)

### What We Have

- **View primitive** — solid, full CSS prop coverage, states, events, theming
- **Text primitive** — typography with theme support
- **CanvasApp runtime** — three-layer architecture (App → Document → Canvas)
- **Editor store** — component tree CRUD, path-based selection, history
- **Editor context** — Svelte 5 context-based dependency injection
- **13 view-ui components** — varying fidelity (1 match, 9 partial, 3 major gaps)
- **shadcn-components/ui/** — 57 components as visual reference (NOT for runtime use)

### What's Broken

- `components/ui/` — deleted (was duplicate re-exports)
- 6 view-ui components imported by editor fields **don't exist**: input, textarea, checkbox, switch, progress, accordion
- 3 editor shell files still import from `shadcn-components/` (CanvasEditor, left sidebar, right sidebar use shadcn Sidebar)
- 2 editor files import shadcn Dialog/Command directly (settings, pages dialog)
- All existing view-ui components missing: focus-visible rings, disabled states, animations, aria-invalid states
- Hardcoded colors throughout instead of theme tokens

---

## Phase 1: Unbreak the Editor (Priority: Critical)

### 1A. Create 6 missing view-ui components the editor already imports

Each follows the same pattern: read shadcn version → translate Tailwind classes → View props.

**input/** (used by 6 editor fields)

- Files: `input.svelte`, `index.ts`
- shadcn ref: `bg-transparent border-input rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50`
- View: `<View as="input">` with border, borderRadius, padding, shadow, focus ring via states

**textarea/** (used by TextField)

- Files: `textarea.svelte`, `index.ts`
- shadcn ref: same as input but with min-h-16 resize-none

**checkbox/** (used by BooleanField)

- Files: `checkbox.svelte`, `index.ts`
- shadcn ref: `peer h-4 w-4 shrink-0 rounded-[4px] border border-primary shadow-xs focus-visible:ring-ring/50`

**switch/** (used by BooleanField, SpacingField)

- Files: `switch.svelte`, `index.ts`
- shadcn ref: `peer h-5 w-9 shrink-0 rounded-full shadow-xs`

**progress/** (used by ImageField)

- Files: `progress.svelte`, `index.ts`
- shadcn ref: `bg-primary/20 h-1 w-full overflow-hidden rounded-full`

**accordion/** (used by ObjectField)

- Files: `accordion.svelte`, `accordion-item.svelte`, `accordion-trigger.svelte`, `accordion-content.svelte`, `index.ts`
- shadcn ref: `border-b` on item, `flex items-center justify-between` on trigger, animation on content

### 1B. Migrate 3 editor shell files off shadcn imports

Replace these imports:

- `CanvasEditor.svelte` — `shadcn-components/ui/sidebar` → `view-ui/sidebar`
- `canvas-editor-left-sidebar.svelte` — same
- `canvas-editor-right-sidebar.svelte` — same

### 1C. Migrate 2 dialog-dependent files

- `editor-settings.svelte` — `shadcn-components/ui/dialog` → create `view-ui/dialog/`
- `canvas-editor-pages-dialog.svelte` — `shadcn-components/ui/dialog` + `command` → create `view-ui/dialog/` + `view-ui/command/`

**Outcome:** Editor compiles and runs with ZERO imports from `shadcn-components/`.

---

## Phase 2: Fix Cross-Cutting Gaps in Existing view-ui Components

Every existing view-ui component needs these fixes:

### 2A. Focus-visible ring (all interactive components)

```
Pattern: on focus-visible → border changes to ring color + 3px ring shadow
Implement via: View `states.focus` prop
```

### 2B. Disabled state (all interactive components)

```
Pattern: opacity: 0.5, pointer-events: none
Implement via: View `disabled` prop (already in ViewProps)
```

### 2C. aria-invalid state (form-related components)

```
Pattern: border → destructive, ring → destructive/20
Implement via: View `states` with conditional styles
```

### 2D. Replace hardcoded colors with theme tokens

- `#b42318` → `canvasTheme.colors.destructive`
- `oklch(0.97 0 0)` → `canvasTheme.colors.muted`
- `color-mix(...)` borders → `canvasTheme.colors.border`

### 2E. SVG handling rules (all components with icon slots)

```
Pattern: child SVGs get size-4, pointer-events-none, shrink-0
Implement via: CSS in component style tag targeting [data-slot] children
```

---

## Phase 3: Fix Component-Specific Gaps

### Tabs (major gap)

- Add active state styling (bg change, shadow)
- Add line variant with animated underline indicator
- Add focus-visible ring
- Add vertical orientation support
- Add disabled state

### Sidebar (major gap)

- Create 8 missing sub-components: rail, menu-sub, menu-sub-button, menu-sub-item, menu-badge, menu-skeleton, sidebar-input, group-action
- Add tooltip integration in provider
- Fix positioning (sticky → fixed for desktop)
- Add cookie-based state persistence

### Card (major gap)

- Create actual View-based card sub-components (currently only barrel re-export)
- card-root, card-header, card-content, card-footer, card-title, card-description, card-action

### Button

- Add `active:translate-y-px` press-down effect
- Fix default variant border to transparent

### Dropdown-Menu

- Add 8 missing sub-components (sub, sub-trigger, sub-content, radio-group, radio-item, checkbox-group, shortcut, group-heading)
- Add animation classes

### Select

- Add 6 missing sub-components (group, group-heading, label, scroll buttons, separator)
- Add focus states, disabled states

---

## Phase 4: Editor Shell Rebuild (Puck Visual Parity)

### Target Layout (matching Puck exactly)

```
┌──────────────────────────────────────────────────┐
│ Header: logo/title | sidebar toggles | actions   │
├────┬─────────────────────────────────────────┬────┤
│Nav │            Canvas                        │ R  │
│    │  ┌───────────────────────────────────┐  │ i  │
│ ◉  │  │  Viewport Controls                │  │ g  │
│ ◉  │  │  ┌─────────────────────────────┐  │  │ h  │
│ ◉  │  │  │                             │  │  │ t  │
│    │  │  │    Rendered Content          │  │  │    │
│    │  │  │    (DropZones + Components)  │  │  │ S  │
│    │  │  │                             │  │  │ i  │
│    │  │  └─────────────────────────────┘  │  │ d  │
│    │  └───────────────────────────────────┘  │ e  │
│    │                                          │ b  │
│ L  │                                          │ a  │
│ e  │                                          │ r  │
│ f  │                                          │    │
│ t  │                                          │    │
│    │                                          │    │
│ S  │                                          │    │
│ i  │                                          │    │
│ d  │                                          │    │
│ e  │                                          │    │
│ b  │                                          │    │
│ a  │                                          │    │
│ r  │                                          │    │
├────┴──────────────────────────────────────────┴────┤
└──────────────────────────────────────────────────┘
```

### Components to build/refine

1. **EditorHeader** — top bar matching Puck's header
2. **EditorNav** — vertical icon strip for panels (Components, Outline, etc.)
3. **EditorLeftSidebar** — resizable, contains component palette + outline tree
4. **EditorCanvas** — viewport frame with zoom, auto-scale
5. **EditorRightSidebar** — resizable, contains field inspector
6. **ViewportControls** — floating toolbar for viewport presets + zoom
7. **ComponentPalette** — draggable component list (like Puck's Drawer)
8. **OutlineTree** — recursive layer tree (like Puck's LayerTree)
9. **ActionBar** — floating toolbar on selected component
10. **SelectionOverlay** — blue outline + resize handles via ResizeObserver

---

## Phase 5: Additional view-ui Components for Editor

Components needed for a complete editor experience:

- **dialog/** — modal overlay for settings, pages
- **command/** — command palette for pages dialog
- **drawer/** — mobile bottom sheet
- **sheet/** — slide-in panel
- **popover/** — floating content (for color pickers, etc.)
- **tooltip/** — hover info (critical for collapsed sidebar)
- **scroll-area/** — styled scrollbars
- **skeleton/** — loading placeholders
- **resizable/** — drag-to-resize panels
- **toggle/** — standalone toggle button
- **radio-group/** — radio selection
- **slider/** — range input

---

## Execution Order

1. **Phase 1A** → Create 6 missing components (unbreaks editor fields)
2. **Phase 1B** → Migrate 3 sidebar imports (unbreaks editor shell)
3. **Phase 1C** → Create dialog + command (unbreaks settings/pages)
4. **Verify** → Editor compiles and renders with zero shadcn imports
5. **Phase 2** → Fix cross-cutting gaps (focus, disabled, theme tokens)
6. **Phase 3** → Fix component-specific gaps (tabs, sidebar, card, button, dropdown, select)
7. **Phase 4** → Editor shell rebuild for Puck visual parity
8. **Phase 5** → Additional components for polish

---

## Component Build Pattern

Every view-ui component follows this structure:

```
view-ui/[component]/
├── [component].svelte       # Main component (or sub-components)
├── index.ts                  # Barrel export
```

### Translation Rules

1. Read shadcn `className` → decompose into individual CSS properties
2. Each Tailwind class → equivalent View prop or inline style
3. `bg-[token]` → `background={canvasTheme.colors.[token]}`
4. `text-[token]` → `color={canvasTheme.colors.[token]}`
5. `rounded-[size]` → `borderRadius="[size]"`
6. `px-N py-M` → `padding="..."` with shorthand
7. `gap-N` → `gap="..."`
8. `focus-visible:...` → View `states.focus` prop
9. `hover:...` → View `states.hover` prop
10. `disabled:...` → View `disabled` prop
11. `data-[state=X]:...` → conditional styles based on props
12. Animations → CSS @keyframes in `<style>` or View transition prop
13. SVG child rules → `<style>` block targeting child elements
