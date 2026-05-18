# Tasks: Canvas Editor Refactor

**Input**: Design documents from `/specs/003-canvas-editor-refactor/`
**Prerequisites**: `spec.md`, `plan.md`

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no blocking dependency)
- Include exact file paths in each task

---

## Phase 1 — Inventory and naming correction

- [ ] T001 Audit current package references to `StudioEditor` and record which should move to `CanvasEditor` in `packages/canvas/src/lib/index.ts`, `packages/canvas/src/lib/base/editor/index.ts`, route demos, examples, and editor templates.
- [ ] T002 Update package-level exports so `CanvasEditor` is the intended generic editor entry in `packages/canvas/src/lib/index.ts` and `packages/canvas/src/lib/base/editor/index.ts`.
- [ ] T003 [P] Update package-level editor demo/example imports and copy in `packages/canvas/src/routes/auth-editor/+page.svelte`, `packages/canvas/src/lib/base/editor/example.svelte`, and `packages/canvas/src/lib/base/editor/code-templates.ts` to prefer `CanvasEditor` naming.
- [ ] T004 [P] Update package docs/readme references that still imply `StudioEditor` is the canonical library editor in `packages/canvas/README.md` and related planning/spec links if needed.

---

## Phase 2 — Surface/sidebar decomposition

- [ ] T005 Create or refactor a dedicated generic editor surface component in `packages/canvas/src/lib/base/editor/canvas-editor-surface.svelte` using the reusable interaction logic from `EditorCanvas.svelte`.
- [ ] T006 Refactor `packages/canvas/src/lib/base/editor/EditorCanvas.svelte` so selection/highlight/runtime logic is either moved into or delegated to the new surface component.
- [ ] T007 Create a dedicated sidebar shell component in `packages/canvas/src/lib/base/editor/canvas-editor-sidebar.svelte` that handles open/close visual structure only.
- [ ] T008 Refactor `packages/canvas/src/lib/base/editor/EditorSidebar.svelte` so inspector logic is separated from shell layout and can be reused by the new sidebar composition.

---

## Phase 3 — Document/app/node inspector split

- [ ] T009 Create `packages/canvas/src/lib/base/editor/canvas-editor-inspector.svelte` to choose between document editing, selected-node editing, and app/runtime settings modes.
- [ ] T010 Create `packages/canvas/src/lib/base/editor/canvas-editor-app-inspector.svelte` to render app/runtime editor fields from `appConfig` and `appEditorConfig`.
- [ ] T011 Create `packages/canvas/src/lib/base/editor/canvas-editor-node-inspector.svelte` to render selected node fields using component catalog/editor schema data.
- [ ] T012 Update editor state/selection behavior in `packages/canvas/src/lib/base/editor/types.ts`, `packages/canvas/src/lib/base/editor/store.ts`, and `packages/canvas/src/lib/base/editor/context.ts` so no selection routes to the document inspector in Properties, while Settings owns app/runtime editing.
- [ ] T013 Update background click behavior in the editor surface so clicking empty space returns the inspector to document editing.

---

## Phase 4 — Left rail and left panel architecture

- [ ] T014 Create a left workflow sidebar shell in `packages/canvas/src/lib/base/editor/canvas-editor-left-sidebar.svelte` using shadcn-svelte sidebar primitives.
- [ ] T015 Create an icon-only left rail in `packages/canvas/src/lib/base/editor/canvas-editor-left-rail.svelte` and map it to `Sidebar.Rail` / tab state.
- [ ] T016 Move Outline and Components into the left panel architecture by refactoring `packages/canvas/src/lib/base/editor/EditorSidebar.svelte` responsibilities or extracting dedicated left-panel bodies.
- [ ] T017 Add a snippet-based extension point for custom left panel content in `packages/canvas/src/lib/base/editor/CanvasEditor.svelte` and related types so integrations can replace or augment native left sidebar tabs.

---

## Phase 5 — Minimal trigger-based CanvasEditor composition

- [ ] T018 Create `packages/canvas/src/lib/base/editor/canvas-editor-trigger.svelte` with a top-right pencil/edit trigger that toggles editor chrome open/closed for the landing demo.
- [ ] T019 Implement the real generic editor composition in `packages/canvas/src/lib/base/editor/CanvasEditor.svelte` using left rail/panel, surface, and right inspector pieces.
- [ ] T020 Refactor `packages/canvas/src/lib/base/editor/EditorComponentHighlight.svelte` so hover shows only visual highlight while selected state shows the integrated title/action pill.
- [ ] T021 Remove the requirement for the old toolbar/header shell from the default generic editor path in `packages/canvas/src/lib/base/editor/StudioEditor.svelte` or replace the file’s responsibilities entirely if it is no longer needed.
- [ ] T022 Ensure editor chrome defaults to closed on all screen sizes in the new `CanvasEditor` landing composition.

---

## Phase 6 — Landing canvas integration and block-owned schema pass

- [ ] T023 Integrate the new editor composition into `packages/canvas/src/routes/landing-canvas/+page.svelte` so the page renders `CanvasApp` with a top-right edit trigger and closed-by-default editor chrome.
- [ ] T024 Ensure the landing canvas editor opens document properties by default and switches to node properties on selection in `packages/canvas/src/routes/landing-canvas/+page.svelte` and related editor wiring.
- [ ] T025 Refactor `packages/canvas/src/lib/blocks/hero/hero-1.svelte` and `packages/canvas/src/lib/blocks/catalog.ts` toward a block-owned authored schema for content, actions, media, and layout instead of relying primarily on nested slot editing.
- [ ] T026 Update inspector section styling and structure in the relevant editor inspector files so section spacing/dividers follow the intended Puck-inspired rhythm.
- [ ] T027 Verify the landing document remains visually intact when the editor is closed by adjusting only route/editor composition files, not the page structure itself, unless necessary.

---

## Phase 7 — Mobile and cleanup pass

- [ ] T028 Design and implement mobile bottom-tab + single-bottom-sheet behavior for left tools / right inspector flows in the relevant editor shell files.
- [ ] T029 Remove dead or obsolete shell assumptions from `packages/canvas/src/lib/base/editor/StudioEditor.svelte`, `packages/canvas/src/lib/base/editor/EditorControls.svelte`, and any old editor-shell-specific helpers no longer needed.
- [ ] T030 Delete or archive obsolete editor files only after references are updated and validation passes.
- [ ] T031 [P] Update editor docs/examples/templates to reflect the left-rail + canvas + right-inspector `CanvasEditor` composition in `packages/canvas/src/lib/base/editor/docs.svelte`, `packages/canvas/src/lib/base/editor/example.svelte`, and `packages/canvas/src/lib/base/editor/code-templates.ts`.
- [ ] T032 [P] Update README/planning/spec cross-references if the final file names differ from the current plan assumptions.

---

## Validation

- [ ] T033 Run `vp check` on changed editor/runtime/demo files after each phase and fix issues before moving on.
- [ ] T034 Run final targeted validation on `packages/canvas/src/lib/base/editor/`, `packages/canvas/src/routes/landing-canvas/`, `packages/canvas/src/lib/blocks/`, and any touched runtime/export files.
- [ ] T035 Manually verify the landing canvas page behavior: editor closed by default, top-right trigger, document inspector by default in Properties, app/runtime settings in Settings, node inspector on selection, return to document on background click.

---

## Parallelization notes

Parallel candidates once naming is settled:

- T003 and T004
- T010 and T011
- T031 and T032

Primary dependency chain:

- T001 → T002 → T005/T007/T014/T015 → T019/T020 → T023/T025 → T029/T030 → T033/T034/T035
