# Implementation Plan: Canvas Editor Refactor

**Branch**: `003-canvas-editor-refactor` | **Date**: 2026-05-18 | **Spec**: [spec.md](/home/nova/studio-nova/specs/003-canvas-editor-refactor/spec.md)
**Input**: Feature specification from `/specs/003-canvas-editor-refactor/spec.md`

## Summary

Refactor the package-level editor into a generic `CanvasEditor` with a Puck-inspired but Svelte-native composition. Preserve `CanvasApp` as the rendered app root, use a top-right edit trigger for the landing demo, adopt a desktop layout of left rail + left panel + canvas + right inspector, keep editor chrome closed by default for the landing demo, and split the old editor shell into smaller reusable parts for document inspection, node inspection, and app/runtime settings.

## Reference Implementation Review

Primary external design/code reference:

- `~/studio-nova/packages/puck/packages/core`

Reviewed reference areas:

- `components/Puck/components/Layout/index.tsx`
- `components/Puck/components/Outline/index.tsx`
- `components/Puck/components/Components/index.tsx`
- `components/Puck/components/Sidebar/index.tsx`
- `components/Puck/components/Fields/index.tsx`

Interpretation rule:

- borrow **information architecture and editing patterns** from Puck
- do **not** port React reducer/hook/store conventions directly into Canvas
- re-express the ideas using Svelte 5 runes, context, snippets, and Canvas runtime/document contracts

## Technical Context

**Language/Version**: TypeScript 6.x with Svelte 5 runes mode  
**Primary Dependencies**: SvelteKit 2.x, Svelte 5 reactivity/context, local Canvas runtime/editor primitives, shadcn-style sidebar primitives already present in the package  
**Storage**: N/A for editor runtime structure itself  
**Testing**: `vp check` on changed editor/runtime/demo files, route/demo validation  
**Target Platform**: Browser-rendered Svelte component library with in-package demo app  
**Project Type**: Component library package with editor/runtime composition demos  
**Performance Goals**: Editor overlay should not disrupt normal landing page rendering when closed and should keep interaction responsive when open  
**Constraints**: Keep `CanvasApp` as root, avoid full editor toolbar shell for the default composition, preserve reusable interaction logic, maintain clean package-level generic naming, adapt design ideas from Puck without porting React-specific architecture directly  
**Scale/Scope**: Package editor refactor, landing canvas editor overlay demo, file rename/split/cleanup pass for editor architecture

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Written spec, plan, and tasks before code**: Pass. This feature now has a dedicated spec and plan.
- **State-driven page design**: Pass. Editor state, app config, node selection, and sidebar visibility are runtime state-driven.
- **Shared Studio navigation coherence**: Pass. The package editor is being clarified as generic; Studio-specific behavior remains outside package scope.
- **Validation strategy defined before implementation**: Pass. `vp check` and demo validation are part of the plan.

No constitutional violations require special justification.

## Project Structure

### Documentation (this feature)

```text
specs/003-canvas-editor-refactor/
├── plan.md
├── spec.md
└── (future) tasks.md
```

### Related package planning

```text
packages/canvas/planning/
├── 26-05-17-canvas-app-runtime-and-responsive-foundation.md
├── 26-05-17-canvas-extension-contribution-model.md
└── 26-05-17-canvas-editor-refactor-plan.md
```

### Source Code (repository root)

```text
packages/
└── canvas/
    ├── src/
    │   ├── lib/
    │   │   ├── base/
    │   │   │   ├── canvas-app/
    │   │   │   ├── canvas/
    │   │   │   ├── editor/
    │   │   │   ├── responsive/
    │   │   │   └── text/
    │   │   └── index.ts
    │   └── routes/
    │       └── landing-canvas/
    └── planning/
```

**Structure Decision**: Work centers in `packages/canvas/src/lib/base/editor/`, but the refactor should split the current editor shell into smaller generic components and keep the landing canvas route as the first real demo consumer of the new composition.

## Planned file actions

### Promote / rename direction

- `src/lib/base/editor/CanvasEditor.svelte` → real top-level generic editor implementation
- package exports should prefer `CanvasEditor`

### Split / extract from current files

- `src/lib/base/editor/EditorCanvas.svelte` → likely refactored toward a surface component
- `src/lib/base/editor/EditorSidebar.svelte` → likely split into right inspector shell + shared sidebar pieces
- add left workflow rail/panel components using shadcn-svelte sidebar primitives

### Potential cleanup/removal targets after migration

- `src/lib/base/editor/StudioEditor.svelte`
- `src/lib/base/editor/EditorControls.svelte` (if no longer used)
- old examples/templates that assume a full toolbar shell

## Implementation Phases

### Phase 0 — Inventory and naming audit

- identify current `StudioEditor` references
- identify which editor pieces are reusable vs shell-specific
- confirm rename/split/delete targets

### Phase 1 — Public generic editor naming

- make `CanvasEditor` the canonical package editor entry
- stop treating `StudioEditor` as the intended package-level editor shell
- update exports and route/demo imports

### Phase 2 — Surface and sidebar decomposition

- extract the interactive canvas surface role
- separate sidebar shell from inspector content
- preserve selection/highlight runtime behavior

### Phase 3 — Document/app/node inspector split

- make document inspector the default Properties target
- add explicit selected node inspector path
- move app/runtime settings to Settings
- define background click behavior to return to document editing

### Phase 4 — Left rail and left panel architecture

- add icon-only left rail
- add left panel body for Outline / Components / custom snippet content
- wire the left panel so it can be customized by integrations with Svelte snippets
- map the shell to shadcn-svelte sidebar primitives, including `Sidebar.Root`, `Sidebar.Content`, `Sidebar.Group`, and `Sidebar.Rail`
- keep the right side dedicated to editing, mirroring the workflow-left / inspector-right split seen in Puck

### Phase 5 — Trigger-based minimal editor composition

- add top-right edit trigger for the landing demo path
- wire editor open/close state
- keep editor chrome closed by default everywhere in the landing demo
- remove full required toolbar/header shell from the default composition

### Phase 6 — Landing canvas integration and block-owned schema pass

- mount the new editor composition over the landing canvas page
- ensure `CanvasApp` remains the rendered root
- confirm the landing remains intact when the editor is closed
- move `Hero.1` toward a block-owned authored inspector schema
- model `Hero.1` sections after the Puck hero inspector pattern: content, actions/buttons, media, and layout

### Phase 7 — Mobile and cleanup pass

- design bottom-tab + single-sheet mobile behavior
- remove dead editor shell assumptions
- delete obsolete files only after references are updated
- update docs/examples/templates to the new editor composition

## Interaction Design Decisions

### Selected component chrome

- hover state keeps only the visual highlight
- selected state shows the compact title/action chrome
- title/action chrome should be one integrated pill, not detached floating label and action bubbles
- chrome placement should be viewport-aware and avoid clipping off-screen edges

### Inspector structure

- the right inspector should use explicit sections with spacing and dividers similar to the Puck inspector rhythm
- section heading, affordance/icon, and field body should have consistent spacing
- blocks/widgets may own structured sections that manage authored sub-structure directly

### Block-owned schema direction

- primitives remain generic field-driven nodes
- blocks/widgets get higher-level authored schemas
- nested slots/children may still exist internally, but they are no longer the primary authoring contract for complex blocks like `Hero.1`

## Complexity Tracking

No constitutional exceptions currently require special justification.

## Related Planning Documents

- [`packages/canvas/planning/26-05-17-canvas-editor-refactor-plan.md`](/home/nova/studio-nova/packages/canvas/planning/26-05-17-canvas-editor-refactor-plan.md)
- [`packages/canvas/planning/26-05-17-canvas-app-runtime-and-responsive-foundation.md`](/home/nova/studio-nova/packages/canvas/planning/26-05-17-canvas-app-runtime-and-responsive-foundation.md)
- [`packages/canvas/planning/26-05-17-canvas-extension-contribution-model.md`](/home/nova/studio-nova/packages/canvas/planning/26-05-17-canvas-extension-contribution-model.md)
