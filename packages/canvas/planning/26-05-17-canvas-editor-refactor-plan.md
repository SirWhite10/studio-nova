# Canvas Plan: Editor Refactor for Minimal Sidebar Runtime

- **Plan Date:** 2026-05-17
- **Planned Start:** 2026-05-17
- **Target Completion:** 2026-05-25
- **Status:** Planned
- **Owners:** Canvas package
- **Dependencies:**
  - `planning/26-05-17-canvas-app-runtime-and-responsive-foundation.md`
  - `specs/002-canvas-app-runtime/spec.md`

## Summary

Refactor the current package-level editor implementation away from the older `StudioEditor` shell into a generic `CanvasEditor` that uses a minimal sidebar-based editing runtime.

This editor should:

- keep `CanvasApp` as the rendered runtime root
- keep the route/demo page free of extra editor header chrome
- open a right sidebar from a small top-right edit trigger
- be closed by default on all screen sizes
- support app/root editing when nothing is selected
- support node/component editing when a canvas node is selected

This plan explicitly treats the current `StudioEditor` implementation as a **reference source and parts source**, not as the final architecture.

---

## Why this plan exists

The current editor code was written before the architecture was clarified around:

- `CanvasApp` as the runtime root
- `CanvasDocument` as the authored model
- `Canvas` as the renderer
- `CanvasEditor` as the generic library editor
- `StudioEditor` as a later nova-cloud/workspace-specific product wrapper

The old editor is still useful, especially for:

- selection logic
- highlight overlays
- inspector field rendering
- editor store/context patterns

But its top-level shell structure is not the desired end state for the Canvas library.

---

## Design goals

1. Make the generic editor in this package truly **`CanvasEditor`**.
2. Remove the assumption that the library editor needs a full toolbar/header shell.
3. Let the landing-canvas demo use a minimal sidebar editing runtime.
4. Preserve and reuse proven interaction logic from the current editor where practical.
5. Keep the editor component tree modular and easy to extend.
6. Make the result easy to hand off to another developer.

---

## Architecture stance

### Generic library editor
Canvas should own:

- editor runtime/state
- selection behavior
- app/root inspector support
- node inspector support
- minimal/default sidebar-based editing experience

### Product/workspace editor
nova-cloud should later own:

- `StudioEditor`
- product/workspace chrome
- deployment controls
- sandbox/workspace-specific actions
- agent/product-specific side panels and flows

---

## Proposed file strategy

## Files to keep and reuse conceptually
These contain useful logic and should be reused or split up rather than blindly discarded.

- `src/lib/base/editor/store.ts`
- `src/lib/base/editor/context.ts`
- `src/lib/base/editor/types.ts`
- `src/lib/base/editor/EditorComponentHighlight.svelte`
- `src/lib/base/editor/fields/*`
- portions of `src/lib/base/editor/EditorCanvas.svelte`
- portions of `src/lib/base/editor/EditorSidebar.svelte`

## Files to rename or replace

### 1. `StudioEditor.svelte`
**Current role:** top-level editor shell  
**Planned action:** replace as the primary public library editor entry

Target direction:
- stop treating this as the canonical editor entry
- move public generic usage to `canvas-editor.svelte`
- either delete `StudioEditor.svelte` after migration or reduce it to a temporary internal migration bridge during the refactor only

### 2. `CanvasEditor.svelte`
**Current role:** thin alias wrapper around `StudioEditor`  
**Planned action:** make this the real top-level generic editor implementation

### 3. `EditorCanvas.svelte`
**Current role:** interactive canvas surface  
**Planned action:** likely rename or split into a more clearly named surface component

Potential target name:
- `canvas-editor-surface.svelte`

### 4. `EditorSidebar.svelte`
**Current role:** monolithic sidebar and inspector renderer  
**Planned action:** split into shell + inspector logic pieces

Potential target files:
- `canvas-editor-sidebar.svelte`
- `canvas-editor-inspector.svelte`
- `canvas-editor-app-inspector.svelte`
- `canvas-editor-node-inspector.svelte`

### 5. `EditorControls.svelte`
**Current role:** toolbar/header controls  
**Planned action:** not needed for the minimal sidebar-based landing demo

Keep temporarily if useful, but remove from the new default editor composition.

## Files likely to be deleted after migration
These should only be deleted after the new composition is functional and references are updated.

Candidates:
- `src/lib/base/editor/StudioEditor.svelte`
- `src/lib/base/editor/EditorControls.svelte` (if no longer used)
- old example/demo code that depends on the old shell model

Deletion should happen only after:
- exports are updated
- routes/examples are updated
- no package docs/templates still depend on the old names

---

## Proposed new component composition

## 1. `canvas-editor.svelte`
Main public generic editor entry.

Responsibilities:
- editor runtime composition
- sidebar provider/state
- selection wiring
- root app editing support
- child composition of trigger + surface + sidebar

## 2. `canvas-editor-trigger.svelte`
Small top-right edit trigger.

Responsibilities:
- pencil/edit icon button
- open/close sidebar
- no toolbar assumptions

## 3. `canvas-editor-surface.svelte`
Interactive preview/canvas surface.

Responsibilities:
- render `CanvasApp`
- preserve node selection
- preserve hover/highlight behavior
- support background click behavior

This should reuse logic from current `EditorCanvas.svelte`.

## 4. `canvas-editor-sidebar.svelte`
Right sidebar shell.

Responsibilities:
- open/close visual shell
- title area
- scroll area
- host inspector content

## 5. `canvas-editor-inspector.svelte`
Inspector router/decision component.

Responsibilities:
- show app/root inspector when no node selected
- show node inspector when node selected

## 6. `canvas-editor-app-inspector.svelte`
App/root property editor.

Responsibilities:
- edit `CanvasApp` config
- expose app-level fields
- later support breakpoints, providers, splash, etc.

## 7. `canvas-editor-node-inspector.svelte`
Selected node property editor.

Responsibilities:
- reuse current property rendering patterns
- show component schema-driven fields

---

## Selection behavior contract

### Default
- no node selected
- sidebar shows `Canvas App` / app-root inspector

### Node click
- selected node becomes active
- sidebar switches to node inspector

### Background click
- clear node selection
- return to app/root inspector

This is intentionally different from an empty no-op root state.

---

## Sidebar behavior contract

- right-side sidebar
- closed by default
- same default on desktop and mobile
- opened by top-right edit trigger
- minimal close/open interaction
- no full-width editor header in the landing demo

---

## Landing demo contract

For `landing-canvas` specifically:

- route renders `CanvasApp` first
- no extra route wrapper editor chrome
- floating edit trigger is overlaid
- opening sidebar does not replace the page
- editor acts as a runtime layer over the landing document

---

## Phase breakdown

## Phase 0 — Inventory and naming audit
- **Start:** 2026-05-17
- **Target Completion:** 2026-05-17
- **Status:** Planned

### Tasks
1. Audit current editor files and references.
2. Identify all references to `StudioEditor`.
3. Identify all places where old toolbar-shell assumptions exist.
4. Decide what will be renamed, split, or removed.

### Deliverables
- concrete rename/delete map

---

## Phase 1 — Public naming correction
- **Start:** 2026-05-17
- **Target Completion:** 2026-05-18
- **Status:** Planned

### Tasks
1. Make `canvas-editor.svelte` the real public editor entry.
2. Update exports to prefer `CanvasEditor`.
3. Remove package-level assumptions that `StudioEditor` is the canonical library editor.
4. Update route/demo imports accordingly.

### Deliverables
- generic public editor naming

---

## Phase 2 — Surface/sidebar split
- **Start:** 2026-05-18
- **Target Completion:** 2026-05-19
- **Status:** Planned

### Tasks
1. Extract or rename the canvas interaction surface from `EditorCanvas.svelte`.
2. Separate sidebar shell from inspector content.
3. Keep highlight/selection logic intact while simplifying composition.

### Deliverables
- `canvas-editor-surface.svelte`
- `canvas-editor-sidebar.svelte`

---

## Phase 3 — App vs node inspector split
- **Start:** 2026-05-19
- **Target Completion:** 2026-05-20
- **Status:** Planned

### Tasks
1. Add dedicated app/root inspector rendering.
2. Add dedicated node inspector rendering.
3. Make empty selection route to app/root editing.

### Deliverables
- `canvas-editor-inspector.svelte`
- `canvas-editor-app-inspector.svelte`
- `canvas-editor-node-inspector.svelte`

---

## Phase 4 — Trigger-based minimal editor composition
- **Start:** 2026-05-20
- **Target Completion:** 2026-05-21
- **Status:** Planned

### Tasks
1. Add top-right edit trigger component.
2. Control sidebar open/close state explicitly.
3. Keep sidebar closed by default on all screen sizes.
4. Remove the old toolbar/header shell from the default composition.

### Deliverables
- `canvas-editor-trigger.svelte`
- minimal `CanvasEditor` composition

---

## Phase 5 — Landing demo integration
- **Start:** 2026-05-21
- **Target Completion:** 2026-05-22
- **Status:** Planned

### Tasks
1. Mount the minimal editor over `landing-canvas`.
2. Ensure `CanvasApp` remains the rendered root.
3. Ensure the landing page remains visually intact when sidebar is closed.
4. Verify root app selection and node selection both work.

### Deliverables
- sidebar-based landing demo editor

---

## Phase 6 — Cleanup and deletion pass
- **Start:** 2026-05-22
- **Target Completion:** 2026-05-23
- **Status:** Planned

### Tasks
1. Remove dead code from old shell assumptions.
2. Delete obsolete files if no longer referenced.
3. Update examples/docs/templates to the new structure.
4. Remove old public naming if safe.

### Deliverables
- cleaner editor package structure

---

## Risks

1. **Over-preserving old shell structure**
   - Avoid letting the old `StudioEditor` layout dictate the new composition.
2. **Premature deletion**
   - Delete only after routes/exports/examples are moved.
3. **Inspector logic duplication**
   - Reuse field rendering logic rather than fork it badly.
4. **Selection regression**
   - Preserve current highlight/selection behavior while refactoring composition.

---

## Acceptance criteria

This refactor is ready when:

1. `CanvasEditor` is the true generic public editor entry.
2. The default editor composition is sidebar-based and minimal.
3. The editor has no required top toolbar/header shell.
4. The sidebar is closed by default and opened by a top-right edit trigger.
5. Root app selection shows app/root fields.
6. Node selection shows node fields.
7. The landing demo uses the new composition cleanly.
8. Old `StudioEditor` assumptions are removed from the package-level architecture.

---

## Notes for handoff

If this work is resumed by another developer, the intended stance is:

- reuse old code where it contains good interaction logic
- do **not** preserve old file structure just because it exists
- prefer new generic names and smaller components
- keep the default editor minimal and library-generic
- let nova-cloud build the richer Studio experience later
