# Tasks: Canvas Editor Rebuild

**Input**: Design documents from `/specs/004-canvas-editor-rebuild/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/public-api.md, quickstart.md

**Organization**: Tasks are grouped by user story and phase. Each task includes exact file paths.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)

---

## Phase 1: Unblock — Create Missing view-ui Components

**Purpose**: The editor has 8 field files importing 6 view-ui components that don't exist yet, plus 2 shell files importing shadcn dialog/command. Fix these first.

**⚠️ CRITICAL**: Editor cannot render inspector or dialogs until these exist.

### 1A. Form Input Components (editor fields)

- [x] T001 [P] [US1] Create `view-ui/input/` — `input.svelte` + `index.ts`
  - Reference: `shadcn-components/ui/input/input.svelte`
  - Classes to translate: `bg-transparent border-input rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50`
  - Used by: TextField, NumberField, ColorField, SpacingField, SizeField, IconField, LinkField, ImageField (8 files)

- [x] T002 [P] [US1] Create `view-ui/textarea/` — `textarea.svelte` + `index.ts`
  - Reference: `shadcn-components/ui/textarea/textarea.svelte`
  - Classes: same as input + `min-h-16 resize-none`
  - Used by: TextField

- [x] T003 [P] [US1] Create `view-ui/checkbox/` — `checkbox.svelte` + `index.ts`
  - Reference: `shadcn-components/ui/checkbox/checkbox.svelte`
  - Classes: `peer h-4 w-4 shrink-0 rounded-[4px] border border-primary shadow-xs focus-visible:ring-ring/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground`
  - Used by: BooleanField

- [x] T004 [P] [US1] Create `view-ui/switch/` — `switch.svelte` + `index.ts`
  - Reference: `shadcn-components/ui/switch/switch.svelte`
  - Classes: `peer h-5 w-9 shrink-0 rounded-full shadow-xs focus-visible:ring-ring/50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input`
  - Used by: BooleanField, SpacingField

- [x] T005 [P] [US1] Create `view-ui/progress/` — `progress.svelte` + `index.ts`
  - Reference: `shadcn-components/ui/progress/progress.svelte`
  - Classes: `bg-primary/20 h-1 w-full overflow-hidden rounded-full` with indicator `bg-primary h-full w-full flex-1`
  - Used by: ImageField

- [x] T006 [P] [US1] Create `view-ui/accordion/` — `accordion.svelte`, `accordion-item.svelte`, `accordion-trigger.svelte`, `accordion-content.svelte`, `index.ts`
  - Reference: `shadcn-components/ui/accordion/`
  - Item: `border-b`; Trigger: `flex items-center justify-between py-4 font-medium hover:underline`; Content: animation
  - Used by: ObjectField

### 1B. Dialog Components (editor shell)

- [x] T007 [US1] Create `view-ui/dialog/` — `dialog.svelte`, `dialog-content.svelte`, `dialog-header.svelte`, `dialog-footer.svelte`, `dialog-title.svelte`, `dialog-description.svelte`, `dialog-overlay.svelte`, `dialog-trigger.svelte`, `dialog-close.svelte`, `dialog-portal.svelte`, `index.ts`
  - Reference: `shadcn-components/ui/dialog/`
  - Content: `bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg duration-200 sm:rounded-lg`
  - Used by: editor-settings.svelte, canvas-editor-pages-dialog.svelte

- [x] T008 [P] [US1] Create `view-ui/command/` — `command.svelte`, `command-input.svelte`, `command-list.svelte`, `command-empty.svelte`, `command-group.svelte`, `command-item.svelte`, `command-separator.svelte`, `index.ts`
  - Reference: `shadcn-components/ui/command/`
  - Used by: canvas-editor-pages-dialog.svelte

### 1C. Migrate Editor Shell Off shadcn

- [x] T009 [US1] Migrate `base/editor/CanvasEditor.svelte` — change `import * as Sidebar from "$lib/shadcn-components/ui/sidebar/index.js"` → `"$lib/components/view-ui/sidebar/index.js"`
- [x] T010 [P] [US1] Migrate `base/editor/canvas-editor-left-sidebar.svelte` — same sidebar import migration
- [x] T011 [P] [US1] Migrate `base/editor/canvas-editor-right-sidebar.svelte` — same sidebar import migration
- [x] T012 [US1] Migrate `base/editor/editor-settings.svelte` — change dialog import from shadcn → view-ui
- [x] T013 [P] [US1] Migrate `base/editor/canvas-editor-pages-dialog.svelte` — change dialog + command imports from shadcn → view-ui

**Checkpoint**: `grep -r "shadcn-components" packages/canvas/src/lib/base/ packages/canvas/src/lib/components/view-ui/` returns ZERO results. Editor compiles and renders.

---

## Phase 2: Cross-Cutting Fixes (All view-ui Components)

**Purpose**: Fix the 4 systematic gaps found in every existing view-ui component.

**Depends on**: Phase 1 complete

- [x] T014 [US2] Add focus-visible ring to all interactive view-ui components (button, select/trigger, input, textarea, checkbox, switch, tabs/trigger, dropdown-menu/item, badge, toggle-group/item, sidebar/menu-button)
  - Pattern: View `states.focus` → `border: canvasTheme.colors.ring, boxShadow: 0 0 0 3px ${canvasTheme.colors.ring}50`

- [x] T015 [US2] Add disabled state to all interactive view-ui components
  - Pattern: View `disabled` prop → `opacity: 0.5, pointerEvents: "none"`

- [x] T016 [US2] Replace all hardcoded colors in view-ui with theme tokens
  - `#b42318` → `canvasTheme.colors.destructive`
  - `oklch(0.97 0 0)` → `canvasTheme.colors.muted`
  - `color-mix(in srgb, currentColor 10%, transparent)` → `canvasTheme.colors.border`
  - Files: all view-ui components

- [x] T017 [P] [US2] Add SVG child handling rules to all view-ui components with icon slots
  - Pattern: `<style>` block → `:global(svg:not([data-size])) { width: 1rem; height: 1rem; pointer-events: none; flex-shrink: 0; }`
  - Files: button, select/trigger, dropdown-menu/item, tabs/trigger, toggle-group/item, badge

- [x] T018 [P] [US2] Add CSS animations for overlay components
  - Pattern: `@keyframes` in `<style>` blocks for fade-in, zoom-in, slide-in
  - Files: dialog, dropdown-menu/content, select/content, command

**Checkpoint**: All 21+ view-ui components have focus rings, disabled states, theme tokens, SVG rules, and animations where applicable.

---

## Phase 3: Component-Specific Gaps

**Purpose**: Fix the 3 components identified as "major gap" in the audit, plus refine the top-used components.

**Depends on**: Phase 2 complete

- [x] T019 [US2] Rebuild `view-ui/card/` — create actual View-based sub-components
  - Files: `card.svelte`, `card-header.svelte`, `card-content.svelte`, `card-footer.svelte`, `card-title.svelte`, `card-description.svelte`, `card-action.svelte`, `index.ts`
  - Currently only barrel re-export from `components/card/` — needs full View-based implementation

- [x] T020 [US2] Fix `view-ui/tabs/` — add active states, line variant, focus rings, vertical orientation
  - Trigger: add `data-active` styling (background, shadow, color change)
  - Trigger: add line variant with animated underline indicator
  - Root: add vertical orientation support
  - Content: add `flex-1` and `outline-none`

- [x] T021 [US2] Fix `view-ui/sidebar/` — add 8 missing sub-components + tooltip integration
  - Missing: `sidebar-rail.svelte`, `sidebar-menu-sub.svelte`, `sidebar-menu-sub-button.svelte`, `sidebar-menu-sub-item.svelte`, `sidebar-menu-badge.svelte`, `sidebar-menu-skeleton.svelte`, `sidebar-input.svelte`, `sidebar-group-action.svelte`
  - Add Tooltip.Provider integration in sidebar-provider
  - Fix: sticky → fixed positioning for desktop

- [x] T022 [P] [US2] Fix `view-ui/button/` — add press-down effect, fix default variant border
  - Add `active:translate-y-px` via View states
  - Fix default variant border from `1px solid ${primary}` → `1px solid transparent`

- [x] T023 [P] [US2] Fix `view-ui/dropdown-menu/` — add 8 missing sub-components + animations
  - Missing: sub, sub-trigger, sub-content, radio-group, radio-item, checkbox-group, shortcut, group-heading
  - Add entry/exit animations via `@keyframes`

- [x] T024 [P] [US2] Fix `view-ui/select/` — add 6 missing sub-components + states
  - Missing: group, group-heading, label, scroll-up-button, scroll-down-button, separator
  - Add focus states, disabled states, scroll behavior

**Checkpoint**: All view-ui components reach "match" or "partial match" level. No "major gap" components remain.

---

## Phase 4: Editor Shell Rebuild (Puck Visual Parity)

**Purpose**: Rebuild the editor shell to match Puck's exact CSS grid layout.

**Depends on**: Phase 3 complete

- [x] T025 [US3] Implement editor header matching Puck's Header component
  - File: `base/editor/canvas-editor-header.svelte`
  - Layout: logo/title area | sidebar toggle buttons | viewport controls | publish/menu area

- [x] T026 [P] [US3] Implement editor nav rail (vertical icon strip for panels)
  - New file: `base/editor/canvas-editor-nav-rail.svelte`
  - Icons: Components, Outline, Fields + registered plugin tabs

- [x] T027 [US3] Implement resizable left sidebar with component palette + outline tree
  - Refactor: `base/editor/canvas-editor-left-sidebar.svelte`
  - Component palette: draggable component list grouped by category
  - Outline tree: recursive layer tree showing component hierarchy

- [x] T028 [US3] Implement canvas surface with viewport controls and zoom
  - Refactor: `base/editor/canvas-editor-surface.svelte`
  - Viewport controls: floating toolbar with presets (mobile, tablet, desktop, full)
  - Zoom: auto-zoom to fit + manual 25%-200%

- [x] T029 [US3] Implement resizable right sidebar with field inspector
  - Refactor: `base/editor/canvas-editor-right-sidebar.svelte`
  - Field sections: component label, schema-driven field editors, component actions

- [x] T030 [P] [US3] Implement selection overlay with action bar
  - Refactor: `base/editor/EditorComponentHighlight.svelte`
  - Blue outline via ResizeObserver positioning
  - Action bar: component label + duplicate, delete, select-parent buttons

- [x] T031 [P] [US3] Implement drag-and-drop from component palette to canvas
  - New file: `base/editor/canvas-editor-drop-zone.svelte`
  - Svelte-native drag (not dnd-kit) with collision detection
  - Insert preview at drop position

**Checkpoint**: Editor shell renders with Puck's 5-region layout. Component selection, insertion, and field editing work end-to-end.

---

## Phase 5: AI Agent Integration

**Purpose**: Ensure the editor's data model supports programmatic page construction.

**Depends on**: Phase 4 complete

- [x] T032 [US4] Verify store API supports programmatic page construction
  - `store.insertComponent()`, `store.setComponents()`, `store.updateComponentProperty()`
  - Test: construct a page with hero + text + card grid via store calls only

- [x] T033 [US4] Verify serialization roundtrip (JSON → render → edit → JSON)
  - CanvasNode tree → `JSON.stringify` → `JSON.parse` → re-render → identical output

- [x] T034 [P] [US4] Document the AI agent API surface
  - Store methods, component catalog structure, CanvasNode schema, field schema

**Checkpoint**: An AI agent can construct a complete page programmatically and serialize it to valid JSON.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: No dependencies — start immediately
- **Phase 2**: Depends on Phase 1 (components must exist before being fixed)
- **Phase 3**: Depends on Phase 2 (cross-cutting fixes applied before component-specific work)
- **Phase 4**: Depends on Phase 3 (complete component library before shell rebuild)
- **Phase 5**: Depends on Phase 4 (working editor before AI integration testing)

### Parallel Opportunities

- All tasks in 1A (T001-T006) can run in parallel
- T007 and T008 can run in parallel
- T009, T010, T011 can run in parallel
- T012, T013 can run in parallel
- T014-T018 can partially overlap (different components)
- T019-T024 can all run in parallel (different component directories)
- T025, T026, T030, T031 can partially overlap (different editor files)

---

## Implementation Strategy

### MVP First (Phase 1 Only)

1. Complete Phase 1A (6 missing components)
2. Complete Phase 1B (dialog + command)
3. Complete Phase 1C (migrate imports)
4. **STOP and VALIDATE**: Editor compiles with zero shadcn imports, all fields render

### Incremental Delivery

1. Phase 1: Unblock editor
2. Phase 2: Systematic quality pass
3. Phase 3: Component-specific refinement
4. Phase 4: Puck-matching editor shell
5. Phase 5: AI integration verification
