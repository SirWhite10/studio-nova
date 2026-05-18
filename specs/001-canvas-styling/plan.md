# Implementation Plan: Canvas Styling Layer

**Branch**: `001-canvas-styling` | **Date**: 2026-05-10 | **Spec**: [spec.md](/home/nova/studio-nova/specs/001-canvas-styling/spec.md)
**Input**: Feature specification from `/specs/001-canvas-styling/spec.md`

## Summary

Implement the first Canvas-owned styling slice for the dashboard demo by keeping `View` as
the primitive rendering substrate, adding semantic layout and card wrappers above it, and
replacing the current Canvas demo's direct reference-package rendering with Canvas-owned
dashboard shell components.

## Technical Context

**Language/Version**: TypeScript 6.x with Svelte 5 runes mode  
**Primary Dependencies**: SvelteKit 2.x, `@sveltejs/package`, local `shadcn-svelte` workspace package  
**Storage**: N/A for the first styling slice  
**Testing**: `svelte-check`, package `prepack`, Canvas demo `build`  
**Target Platform**: Browser-rendered Svelte component library with SvelteKit demo app and SSR dev/build support  
**Project Type**: Component library package with in-package demo application  
**Performance Goals**: Render the supported dashboard slice without visible hierarchy regressions or obvious layout instability during normal demo load  
**Constraints**: No import of the reference package stylesheet into Canvas, preserve primitive-vs-semantic layering, defer full chart/table behavior parity  
**Scale/Scope**: Initial slice covers primitives, semantic layout, card family, sidebar shell, page header, and shell-level chart/table sections for one dashboard demo page

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Written spec, plan, and tasks before code**: Pass. This plan follows the required staged workflow and will be followed by task generation before implementation.
- **State-driven page design**: Pass for current scope. The first slice focuses on the populated dashboard state, but the component boundaries preserve room for later empty, loading, and error variants.
- **Shared Studio navigation coherence**: Pass. Sidebar shell and page shell are explicitly in scope and will be implemented as reusable Canvas-owned structures rather than one-off page markup.
- **Validation strategy defined before implementation**: Pass. Package `prepack`, Canvas `build`, and demo rendering checks are part of the plan.

No constitutional violations require special justification for this slice.

## Project Structure

### Documentation (this feature)

```text
specs/001-canvas-styling/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── public-api.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/
├── canvas/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── base/
│   │   │   │   └── view/
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   ├── card/
│   │   │   │   └── dashboard/
│   │   │   └── index.ts
│   │   └── routes/
│   │       └── +page.svelte
│   └── package.json
└── shadcn-svelte/
    └── src/
        └── lib/
            └── components/
```

**Structure Decision**: Work is centered in `packages/canvas`, with `packages/shadcn-svelte`
used as the structural and visual reference package. New Canvas semantic components should be
introduced under `packages/canvas/src/lib/components/`, while the existing primitive layer in
`packages/canvas/src/lib/base/view/` remains the substrate.

## Complexity Tracking

No constitutional exceptions or special complexity justifications are required for this plan.
