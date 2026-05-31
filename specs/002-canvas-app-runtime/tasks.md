# Tasks: Canvas App Runtime

**Input**: Design documents from `/specs/002-canvas-app-runtime/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/public-api.md, quickstart.md

**Organization**: Tasks are grouped by user story and implementation phase. This file now reflects current repo reality: many baseline runtime tasks are already implemented, while a small number of closure and alignment tasks remain.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: Which user story this task supports (US1-US5)

---

## Phase 1: Runtime Foundation

**Purpose**: Establish `CanvasApp`, responsive types, and runtime separation.

- [x] T001 [US1] Create `packages/canvas/src/lib/base/canvas-app/CanvasApp.svelte`
- [x] T002 [P] [US1] Create `packages/canvas/src/lib/base/canvas-app/types.ts` for `CanvasAppConfig`, splash config, and context value types
- [x] T003 [P] [US1] Create `packages/canvas/src/lib/base/canvas-app/context.ts` for app runtime context delivery
- [x] T004 [US1] Export `CanvasApp` and app runtime types from `packages/canvas/src/lib/index.ts`
- [x] T005 [US1] Keep `CanvasApp` outside the document tree while preserving `CanvasDocument` as the authored model

**Checkpoint**: `CanvasApp` exists as a first-class runtime root and is not represented as a document child node.

---

## Phase 2: Responsive Foundation

**Purpose**: Introduce app-owned responsive configuration and reusable responsive resolution.

- [x] T006 [US2] Create shared responsive types in `packages/canvas/src/lib/base/responsive/types.ts`
- [x] T007 [P] [US2] Create default viewport/container breakpoint definitions in `packages/canvas/src/lib/base/responsive/breakpoints.ts`
- [x] T008 [P] [US2] Create responsive resolution helpers in `packages/canvas/src/lib/base/responsive/resolve-responsive.ts`
- [x] T009 [P] [US2] Create runtime query helpers in `packages/canvas/src/lib/base/responsive/media-query.svelte.ts`
- [x] T010 [US2] Export responsive types and helpers from `packages/canvas/src/lib/index.ts`
- [x] T011 [US2] Preserve both viewport and container branches in the stored responsive value model
- [x] T012 [US2] Support sparse breakpoint overrides instead of requiring all breakpoints to be populated

**Checkpoint**: Responsive values resolve from app/runtime config rather than hardcoded per-component thresholds.

---

## Phase 3: Provider Runtime and Demo Adoption

**Purpose**: Route provider state/actions through the runtime root and prove the architecture with demos.

- [x] T013 [US4] Route `providerData` and `providerActions` through `CanvasApp`
- [x] T014 [P] [US4] Preserve compatibility with existing Canvas runtime flow in `packages/canvas/src/lib/base/canvas/`
- [x] T015 [US1] Update demo usage so documents can render through `CanvasApp`
- [x] T016 [P] [US4] Create or maintain provider-backed examples in:
  - `packages/canvas/src/routes/document-demo/+page.svelte`
  - `packages/canvas/src/routes/form-demo/+page.svelte`
- [x] T017 [US2] Add app-configured responsive demo usage in `packages/canvas/src/routes/landing-canvas/+page.svelte`

**Checkpoint**: At least one demo renders through `CanvasApp` and at least one demo uses provider runtime from the app layer.

---

## Phase 4: Responsive Text Ownership

**Purpose**: Move typography ownership into `Text` while preserving classes for non-typography concerns.

- [x] T018 [US3] Extend `packages/canvas/src/lib/base/text/` to support responsive typography props
- [x] T019 [P] [US3] Support responsive resolution for `size`
- [x] T020 [P] [US3] Support responsive resolution for `weight`
- [x] T021 [P] [US3] Support responsive resolution for `lineHeight`
- [x] T022 [P] [US3] Support responsive resolution for `letterSpacing`
- [x] T023 [P] [US3] Support responsive resolution for `textAlign`
- [x] T024 [US3] Keep utility classes available for layout, animation, spacing, and visual effects
- [x] T025 [US3] Update the landing hero path so title/description sizing is driven by responsive `Text` props instead of Tailwind typography classes

**Checkpoint**: Hero and similar copy can rely on responsive `Text` props as the primary typography source.

---

## Phase 5: Editor Alignment

**Purpose**: Align the generic editor with the runtime model.

- [x] T026 [US5] Converge on `CanvasEditor` as the package-level generic editor export
- [x] T027 [P] [US5] Keep `StudioEditor.svelte` as a compatibility wrapper / transitional alias
- [x] T028 [US5] Support app-level editing inputs in `CanvasEditor` via `appConfig`, `appEditorConfig`, and `updateAppProperty`
- [x] T029 [US5] Decide and document root selection semantics: `CanvasDocument` is the editing root, while `CanvasApp` remains a runtime shell outside editor selection
- [x] T030 [P] [US5] Confirm no editor-store change is required to model `CanvasApp` as a root selection object, because app-level editing should remain separate from document-root selection

**Checkpoint**: The editor can clearly operate on app-level state while preserving `CanvasDocument` as the editing root and `CanvasApp` as the runtime shell.

---

## Phase 6: Spec and Documentation Closure

**Purpose**: Finish the spec package so `002` is a maintained source of truth rather than a loose draft.

- [x] T031 [US1] Create missing spec companion files:
  - `specs/002-canvas-app-runtime/tasks.md`
  - `specs/002-canvas-app-runtime/data-model.md`
  - `specs/002-canvas-app-runtime/research.md`
  - `specs/002-canvas-app-runtime/quickstart.md`
  - `specs/002-canvas-app-runtime/contracts/public-api.md`
  - `specs/002-canvas-app-runtime/checklists/requirements.md`
- [x] T032 [US1] Update `specs/002-canvas-app-runtime/spec.md` status from `Draft` to `Implemented Baseline` now that the runtime/editor-root decision is resolved
- [x] T033 [P] [US1] Tighten `packages/canvas/README.md` so the `CanvasApp` / `CanvasDocument` / `Canvas` / `CanvasEditor` / `StudioEditor` hierarchy is explicit and current
- [x] T034 [P] [US4] Ensure package-level planning docs remain aligned with the final runtime boundary and extension handoff language

**Checkpoint**: `002` has full structure and accurate closure documentation.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: complete
- **Phase 2**: depends on Phase 1 — complete
- **Phase 3**: depends on Phases 1-2 — complete
- **Phase 4**: depends on Phases 1-2 — complete
- **Phase 5**: complete; root-selection semantics are now explicit
- **Phase 6**: can proceed now for documentation closure

### Parallel Opportunities

- T033 and T034 can proceed independently
- T034 can be done in parallel with README cleanup

---

## Current Gap Summary

Open items still blocking a fully closed `002`:

- None at the spec/runtime-boundary level; future work is implementation evolution rather than unresolved architecture wording
