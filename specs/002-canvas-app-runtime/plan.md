# Implementation Plan: Canvas App Runtime

**Branch**: `002-canvas-app-runtime` | **Date**: 2026-05-17 | **Spec**: [spec.md](/home/nova/studio-nova/specs/002-canvas-app-runtime/spec.md)
**Input**: Feature specification from `/specs/002-canvas-app-runtime/spec.md`

## Summary

Introduce a first-class `CanvasApp` runtime root above all Canvas renders, add a reusable responsive foundation with app-defined breakpoint configuration and viewport/container responsive modes, route provider runtime through the app shell, and update `Text` to own responsive typography while preserving non-typography utility classes.

This implementation plan is intentionally broader than a simple hero styling fix because the original issue exposed a missing runtime/editor boundary. The work started from `Text` typography behavior, but the correct solution requires runtime-owned responsiveness, app-level configuration, and a clearer generic-editor vs product-editor split.

A useful conceptual reference is Puck-style schema-driven editing, but this implementation should remain Canvas-specific in these ways:

- `CanvasApp` stays distinct from `CanvasDocument` and `Canvas`
- the generic editor is a default/reference editor, not the only editor
- integrations may later use manifests and schemas without adopting the default editor UI
- the type surface should stay easy for LLMs, agents, and code harnesses to inspect

## Technical Context

**Language/Version**: TypeScript 6.x with Svelte 5 runes mode  
**Primary Dependencies**: SvelteKit 2.x, Svelte 5 `svelte/reactivity`, local Canvas runtime/types/components  
**Storage**: N/A in the library runtime; configuration remains in document/app data  
**Testing**: `svelte-check`, package build/prepack, demo route verification  
**Target Platform**: Browser-rendered Svelte component library with SSR-compatible demo app  
**Project Type**: Component library package with in-package demo application  
**Performance Goals**: Responsive resolution and runtime context must not introduce visible layout instability in normal demo usage  
**Constraints**: Preserve document vs renderer vs runtime separation, avoid hardcoded per-component breakpoint ownership, do not make arbitrary user code execution part of Canvas runtime  
**Scale/Scope**: Canvas runtime boundary, responsive type/runtime foundation, provider runtime flow, responsive `Text`, and migration of the landing Canvas demo path

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Written spec, plan, and tasks before code**: Pass. This plan and spec exist before implementation.
- **State-driven page design**: Pass. Responsive configuration and runtime context are explicitly state-driven and root-owned.
- **Shared Studio navigation coherence**: Pass. The work introduces app/runtime boundaries without fragmenting the authored model.
- **Validation strategy defined before implementation**: Pass. `svelte-check`, build checks, and demo validation are part of the plan.

No constitutional violations require special justification.

## Project Structure

### Documentation (this feature)

```text
specs/002-canvas-app-runtime/
├── plan.md
├── spec.md
└── (future) tasks.md
```

### Related package planning

```text
packages/canvas/planning/
├── 26-05-17-canvas-app-runtime-and-responsive-foundation.md
└── 26-05-17-canvas-extension-contribution-model.md
```

### Source Code (repository root)

```text
packages/
└── canvas/
    ├── src/
    │   ├── lib/
    │   │   ├── base/
    │   │   │   ├── canvas/
    │   │   │   ├── responsive/
    │   │   │   ├── text/
    │   │   │   └── view/
    │   │   ├── blocks/
    │   │   ├── components/
    │   │   └── index.ts
    │   └── routes/
    │       ├── +page.svelte
    │       └── landing-canvas/
    ├── planning/
    └── README.md
└── specs/
    └── 002-canvas-app-runtime/
```

**Structure Decision**: Runtime and responsive foundation work will be centered in `packages/canvas/src/lib/base/`, with `CanvasApp`-related runtime context introduced above existing Canvas rendering internals. Demo adoption will happen inside `packages/canvas/src/routes/landing-canvas/` and any current root render paths that need migration.

## Implementation Phases

### Phase 0 — Planning and alignment
- confirm `CanvasApp` / `CanvasDocument` / `Canvas` hierarchy
- confirm responsive value data model
- confirm app-owned breakpoint configuration
- confirm provider/runtime centralization path

### Phase 1 — Responsive types and breakpoint definitions
- add shared responsive types
- add breakpoint definitions and defaults
- add root/app responsive config types
- add pure responsive resolution helpers

### Phase 2 — Responsive runtime layer
- add viewport runtime helper using Svelte `MediaQuery`
- add container breakpoint resolution path
- wire runtime resolution to app-provided breakpoint definitions
- preserve base-safe behavior during SSR/hydration

### Phase 3 — `CanvasApp` runtime root
- define `CanvasApp` API and runtime config types
- add runtime context and app-owned config delivery
- wrap Canvas rendering with app-level runtime shell
- keep `Canvas` as renderer-only primitive
- define the editor-facing root model so app-level selection targets `CanvasApp`

### Phase 4 — Provider/runtime foundation
- centralize provider data/actions through the app runtime
- preserve compatibility with existing Canvas runtime flow
- define provider-related extension points for future work

### Phase 5 — Responsive `Text`
- extend text sizing scale
- support responsive typography props
- resolve text typography from responsive config instead of Tailwind typography classes
- preserve utility classes for non-typography styling

### Phase 6 — Root breakpoint config adoption
- add root-configured breakpoint usage to demo/example flows
- update landing Canvas hero to use responsive text props
- validate document/runtime separation in real examples

### Phase 7 — Migration, validation, and follow-up readiness
- validate demos and package docs
- document runtime hierarchy clearly
- document the thought process from `Text`/hero issue to runtime/editor architecture change so handoff to another developer stays understandable
- record the package-level shift toward `CanvasEditor` and the nova-cloud-owned `StudioEditor` wrapper direction
- explicitly track planned rename work from current package-level `StudioEditor` implementation toward `CanvasEditor`
- leave implementation surface ready for tasks/docs/README follow-up

## Complexity Tracking

No constitutional exceptions currently require special justification.

## Related Planning Documents

- [`packages/canvas/planning/26-05-17-canvas-app-runtime-and-responsive-foundation.md`](/home/nova/studio-nova/packages/canvas/planning/26-05-17-canvas-app-runtime-and-responsive-foundation.md)
- [`packages/canvas/planning/26-05-17-canvas-extension-contribution-model.md`](/home/nova/studio-nova/packages/canvas/planning/26-05-17-canvas-extension-contribution-model.md)
