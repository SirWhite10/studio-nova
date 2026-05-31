# Canvas Plan: App Runtime + Responsive Foundation

- **Plan Date:** 2026-05-17
- **Planned Start:** 2026-05-17
- **Target Completion:** 2026-05-24
- **Status:** Planned
- **Owners:** Canvas package
- **Reviewers:** Future implementation pass, docs pass, landing/docs pass

## Summary

Introduce a first-class `CanvasApp` runtime root for all Canvas documents and build a reusable responsive foundation that supports:

- app-level runtime config
- viewport and container responsive modes
- root-defined breakpoint definitions with Tailwind-like defaults
- provider/runtime registration and delivery
- splash/loading shell support
- future expansion into docs, README, landing page, and editor UX

This plan intentionally separates:

- **CanvasDocument** = authored, serializable composition data
- **Canvas** = renderer that renders a document with a component registry and runtime inputs
- **CanvasApp** = runtime shell and app-level execution environment

## Why this plan exists

This plan started from a narrow UI issue and expanded deliberately.

The immediate trigger was the landing hero work:

- the hero became a data-driven Canvas block
- the heading and paragraph were rendered through Canvas `Text` primitives
- the `Text` primitive applies inline typography styles
- those inline styles overrode Tailwind typography utility classes
- matching the existing landing hero therefore could not be solved cleanly by only tweaking classes

That exposed a deeper requirement:

- Canvas text primitives need to own their responsive typography directly
- responsive values need a reusable system rather than one-off component logic
- breakpoints need to be configured at the app/runtime level
- provider/runtime concerns need a top-level shell above the renderer
- the editor needs a clear distinction between document-root editing and app-level runtime configuration

So although this work began with text sizing in a hero, the correct solution is a foundational runtime/editor architecture change rather than another local styling patch.

## External reference and design stance

A useful conceptual reference is **Puck** (React), a schema-driven visual editor/page builder.

What is relevant from that family of tools:

- component registry driven editing
- serialized document/content model
- field-schema-driven inspector editing
- drag/drop as editor behavior rather than component behavior
- a generic editor UI that can render declared schemas

What Canvas should intentionally do differently:

- keep a stronger separation between **runtime**, **document**, **renderer**, and **editor**
- support **app surfaces**, **widgets**, and **provider-backed integrations**, not only page-builder blocks
- treat the generic editor as a **default/reference editor**, not the only editor
- allow integrations to provide **manifest-only contributions** when they do not need a full custom editor UI
- optimize the type surface for **LLMs, code harnesses, and agentic generation**

The design target is therefore:

- **Puck-like in schema-driven editing concepts**
- but **Canvas-specific in runtime separation, extension model, and LLM-friendly contracts**

## Recovery / handoff summary

If this work must be resumed from scratch, the core chain of reasoning is:

1. The landing hero exposed a `Text` primitive conflict: inline typography styles overrode Tailwind text sizing classes.
2. The real fix is not another hero-specific patch; it is letting `Text` own responsive typography directly.
3. Once `Text` owns responsive typography, responsive values need a reusable breakpoint-aware system.
4. Once responsiveness is reusable, breakpoint definitions must be owned by an app/runtime root rather than duplicated in components.
5. Once app-level runtime config exists, the renderer needs a runtime shell above it: `CanvasApp`.
6. Once `CanvasApp` exists, the editor should keep `CanvasDocument` as the editing root while exposing app-level runtime fields through dedicated flows.
7. Once the editor and runtime are generic, nova-cloud can wrap them with a product-specific `StudioEditor`.
8. Once that boundary exists, integrations/extensions can target manifests, schemas, providers, widgets, and optional editor customization without redefining the core renderer.

## Runtime Hierarchy

The intended runtime hierarchy is:

1. **`CanvasApp`** — top-level runtime root
2. **`CanvasDocument`** — authored JSON/data model being rendered
3. **`Canvas`** — low-level renderer that renders the document it is given

Important clarification:

- `CanvasApp` is **not** the first child node in the document tree.
- `CanvasApp` wraps the Canvas render system from above.
- `Canvas` remains a renderer only; it should render whatever document/registry/runtime inputs its parent provides.
- `CanvasDocument` is conceptually above `Canvas`, even when it is represented as a TypeScript object rather than a Svelte component.

---

## Primary Goals

1. Create a required app/runtime boundary for every Canvas render.
2. Make responsive behavior data-driven from the app/document root.
3. Support both viewport and container responsive modes.
4. Preserve sparse responsive field values with non-destructive mode switching.
5. Keep `Text` editor-friendly while letting it own typography and responsiveness.
6. Establish the provider/action/runtime structure needed for richer app surfaces.
7. Leave clear follow-up paths for docs, landing page, and README generation.

---

## Non-Goals for This Initial Implementation

1. Full visual editor UI for responsive fields.
2. Full container query authoring UX for all components.
3. Full docs site rewrite.
4. Full migration of every existing component to responsive props.
5. SSR breakpoint-aware rendering beyond base/default-safe output.

---

## Architecture Decisions

### 1. Canvas runtime root

Every rendered canvas should flow through a `CanvasApp` root component.

Responsibilities:

- provide runtime context
- provide responsive config/breakpoint definitions
- provide provider data/actions
- provide splash/loading shell behavior
- host future app-level capabilities

### 2. Document vs app boundary

- `CanvasDocument` remains a portable, serializable artifact.
- `CanvasApp` owns runtime behavior and environment.

### 2a. Editor boundary

- The generic editor in this package should be **`CanvasEditor`**.
- `CanvasDocument` remains the editing root for document-oriented editor selection.
- `CanvasApp` remains the runtime shell and should not become the document-root selection target.
- App-level runtime settings can still be edited through dedicated app/document editor flows.
- A studio/workspace-specific editor such as **`StudioEditor`** should live in **nova-cloud**, where workspace-specific behavior can expand independently of the Canvas library.
- The current `StudioEditor` implementation in this package should be treated as a compatibility/generalization surface, not as the long-term package-level branding.
- nova-cloud may expose a different or larger editor configuration surface than the base Canvas editor because it is a product layer, not the library layer.

### 2b. Why the editor split matters

- The Canvas package should provide the reusable editor contract, runtime contract, and render contract.
- nova-cloud should be free to build a richer workspace/studio experience on top without forcing all product-specific choices back into the library.
- This helps future handoff because a developer can reason about the system in layers:
  - **CanvasApp** = runtime shell
  - **CanvasDocument** = authored model
  - **Canvas** = renderer
  - **CanvasEditor** = generic authoring surface
  - **StudioEditor** = nova-cloud-specific authoring product

### 3. Responsive model

Responsive values should:

- support `viewport` and `container` modes
- preserve both mode branches in data
- only resolve/render the active mode
- store sparse overrides only for breakpoints explicitly added by the user

### 4. Breakpoint ownership

Breakpoint definitions should be editable at the app/root level and default to Tailwind-like values.

### 5. Text ownership of typography

`Text` should own:

- font size
- weight
- line height
- letter spacing
- text alignment
- responsive typography values

Tailwind classes on `Text` should remain available for:

- animation
- layout
- spacing
- effects
- non-typography utility styling

---

## Proposed Breakpoint Scale

### Default viewport breakpoints

- `base`: fallback/default
- `xs`: 240px
- `sm`: 320px
- `md`: 640px
- `lg`: 768px
- `xl`: 1024px
- `2xl`: 1280px
- `3xl`: 1536px
- `4xl`: 1920px
- `5xl`: 2560px

### Default container breakpoints

Initial recommendation: start with the same key scale as viewport, but allow separate root definitions later.

---

## Proposed Runtime/Data Model

### Core concepts

- `CanvasDocument`
- `CanvasApp`
- `CanvasAppConfig`
- `CanvasResponsiveConfig`
- `ResponsiveValue<T>`
- `ResponsiveModeValue<T>`
- `CanvasProviderRegistry`
- `CanvasSplashConfig`

### Responsive behavior

Each responsive field stores:

- active mode (`viewport` or `container`)
- viewport branch
- container branch
- sparse breakpoint overrides per branch

### Root breakpoint behavior

The app/root runtime provides:

- viewport breakpoint definitions
- container breakpoint definitions
- defaults when not overridden

---

## Phase Plan

## Phase 0 — Planning and alignment

- **Start:** 2026-05-17
- **Target Completion:** 2026-05-17
- **Status:** Planned

### Objectives

- finalize architecture direction
- lock terminology
- write implementation plan

### Tasks

1. Confirm `CanvasDocument` vs `CanvasApp` split.
2. Confirm viewport/container responsive model.
3. Confirm root-level breakpoint ownership.
4. Confirm `Text` will own typography responsiveness.
5. Record final plan in `packages/canvas/planning`.

### Deliverables

- this planning file

### Review Notes

- validate naming before implementation begins
- validate whether `CanvasApp` is required for all render paths or temporarily optional behind a compatibility wrapper

---

## Phase 1 — Introduce responsive types and breakpoint definitions

- **Start:** 2026-05-17
- **Target Completion:** 2026-05-18
- **Status:** Planned

### Objectives

- establish shared responsive type system
- establish configurable breakpoint definitions

### Tasks

1. Add `src/lib/base/responsive/types.ts`.
2. Add `src/lib/base/responsive/breakpoints.ts`.
3. Define Tailwind-like default viewport breakpoints.
4. Define initial default container breakpoints.
5. Define root-level responsive config types for app/runtime.
6. Add helper signatures and pure resolver utilities.

### File Targets

- `src/lib/base/responsive/types.ts`
- `src/lib/base/responsive/breakpoints.ts`
- `src/lib/base/responsive/resolve-responsive.ts`
- possibly `src/lib/index.ts` exports

### Deliverables

- reusable responsive type system
- default breakpoint definitions
- pure resolution helpers

### Review Notes

- confirm breakpoint names and widths feel right on tiny screens and 4K+ displays
- confirm container breakpoints should start equal to viewport defaults or immediately diverge

---

## Phase 2 — Build responsive runtime layer

- **Start:** 2026-05-18
- **Target Completion:** 2026-05-19
- **Status:** Planned

### Objectives

- build reactive responsive runtime support
- support viewport and container modes

### Tasks

1. Add `src/lib/base/responsive/media-query.svelte.ts`.
2. Use Svelte `MediaQuery` for viewport breakpoint matching.
3. Design container-width observation helper for container mode.
4. Build active breakpoint resolution utilities.
5. Make runtime query creation accept app/root breakpoint definitions.
6. Ensure safe default/base behavior before hydration.

### File Targets

- `src/lib/base/responsive/media-query.svelte.ts`
- any supporting container observer utilities

### Deliverables

- runtime responsive query helper layer
- active breakpoint state calculation
- root-config-driven breakpoint matching

### Review Notes

- verify no hardcoded breakpoint values remain in runtime consumers
- verify client hydration behavior remains stable
- review whether container mode should rely on `ResizeObserver`, container registration, or both

---

## Phase 3 — Introduce `CanvasApp` runtime root

- **Start:** 2026-05-19
- **Target Completion:** 2026-05-20
- **Status:** Planned

### Objectives

- create a first-class runtime boundary for Canvas
- move app-level concerns out of ad hoc render paths

### Tasks

1. Define `CanvasApp` component API.
2. Define `CanvasAppConfig` type family.
3. Define `CanvasResponsiveConfig` root config.
4. Define `CanvasSplashConfig`.
5. Define provider/action registration interfaces.
6. Create runtime context for descendants.
7. Update current Canvas render entry points to use `CanvasApp`.
8. Add compatibility path for existing `Canvas` usage if needed.
9. Plan the editor-facing app/document selection model so root selection maps to `CanvasApp`, not an empty document root.

### File Targets

- `src/lib/base/canvas-app/` or similar new runtime folder
- `src/lib/index.ts`
- existing canvas render entry files

### Deliverables

- `CanvasApp` root component
- app-level runtime context
- root-level responsive config delivery

### Review Notes

- decide whether `Canvas` becomes a thin wrapper around `CanvasApp`
- review app config surface for overreach vs staged rollout

---

## Phase 4 — Provider/runtime foundation

- **Start:** 2026-05-20
- **Target Completion:** 2026-05-21
- **Status:** Planned

### Objectives

- formalize provider and action runtime surface
- let `CanvasApp` own runtime data delivery

### Tasks

1. Audit current provider data/action types.
2. Define app-level provider registry/config shape.
3. Connect provider data and actions through `CanvasApp` context.
4. Preserve compatibility with current `providerData` / `providerActions` flow.
5. Add examples for runtime-driven data delivery.

### File Targets

- canvas runtime types
- provider-related type files
- render pipeline integration files

### Deliverables

- formal provider runtime pipeline
- app-level provider registration model

### Review Notes

- ensure existing demos do not break
- decide later whether providers are document-owned, app-owned, or both with merge precedence

---

## Phase 5 — Responsive `Text` implementation

- **Start:** 2026-05-21
- **Target Completion:** 2026-05-22
- **Status:** Planned

### Objectives

- make `Text` own responsive typography
- preserve Tailwind class use for non-typography utilities

### Tasks

1. Extend `TextSize` scale to include at least `5xl`, `6xl`, `7xl`.
2. Update `TextProps` to support responsive values for:
   - `size`
   - `weight`
   - `lineHeight`
   - `letterSpacing`
   - `textAlign`
3. Resolve active responsive values before style generation.
4. Refactor text style/theme ownership to avoid duplicate typography outputs.
5. Keep `class` as pass-through for animation/layout/effects.
6. Update example hero/title content to use responsive `Text` props instead of typography Tailwind classes.

### File Targets

- `src/lib/base/text/text-types.ts`
- `src/lib/base/text/text-styles.svelte.ts`
- `src/lib/base/text/text-theme.svelte.ts`
- `src/lib/base/text/text.svelte`
- `src/routes/landing-canvas/document.ts`

### Deliverables

- responsive text primitive
- hero title/paragraph rendered correctly
- clean separation of typography props vs utility classes

### Review Notes

- validate if `color` should remain non-responsive in phase 1
- validate if transform should stay scalar-only initially
- check if editor field schema needs placeholder support before full responsive UI lands

---

## Phase 6 — Root breakpoint config in app/document flows

- **Start:** 2026-05-22
- **Target Completion:** 2026-05-22
- **Status:** Planned

### Objectives

- make breakpoints editable/configurable at the root app level
- connect root config to runtime resolution

### Tasks

1. Add root responsive config to example app/document.
2. Wire root breakpoint config into responsive runtime helper creation.
3. Add default fallback behavior when no custom config exists.
4. Ensure child responsive fields only reference semantic keys.

### File Targets

- `CanvasApp` config files
- example document/app files
- route demos using Canvas

### Deliverables

- root-defined breakpoint runtime support
- default fallback behavior preserved

### Review Notes

- later editor work should expose these root breakpoints in the app/document inspector
- review whether custom labels per breakpoint are useful in the first editor pass

---

## Phase 7 — Demo and migration pass

- **Start:** 2026-05-22
- **Target Completion:** 2026-05-23
- **Status:** Planned

### Objectives

- validate architecture with real Canvas examples
- reduce drift between reference hero and Canvas hero

### Tasks

1. Migrate landing canvas demo to `CanvasApp` runtime.
2. Update hero block to match reference landing hero where intended.
3. Add at least one responsive `Text` example beyond hero.
4. Add at least one example using app-level custom breakpoints.
5. Add at least one example placeholder or proof for container mode.

### Deliverables

- updated landing canvas demo
- runtime-backed example coverage

### Review Notes

- explicitly compare reference hero vs Canvas hero classes and behavior after migration
- verify base/default-safe rendering before hydration

---

## Phase 8 — Editor planning hooks and future-proofing

- **Start:** 2026-05-23
- **Target Completion:** 2026-05-23
- **Status:** Planned

### Objectives

- leave implementation hooks for responsive editor UI
- avoid refactors later

### Tasks

1. Define field-state shapes that support sparse responsive values.
2. Define intended editor behavior for mode tabs/toggles.
3. Define add/remove breakpoint override behavior.
4. Record future root breakpoint editor requirements.
5. Mark follow-up work for container query field support across other components.

### Deliverables

- stable data shape for future editor work
- notes for responsive field UX

### Review Notes

- editor should preserve inactive mode data
- field controls should not force all breakpoints to be filled

---

## Phase 9 — Documentation and landing follow-up preparation

- **Start:** 2026-05-23
- **Target Completion:** 2026-05-24
- **Status:** Planned

### Objectives

- prepare implementation outputs to feed docs and README later
- leave a clean record for landing/docs work

### Tasks

1. Record final type exports and public API surfaces.
2. Note example snippets worth reusing in README/docs.
3. Note landing page messaging points for:
   - CanvasApp
   - responsive foundation
   - provider runtime
   - data-driven breakpoints
4. Note docs sections required after implementation.

### Deliverables

- implementation notes for README and docs buildout
- stable checklist for follow-up documentation pass

### Review Notes

- docs should include both conceptual architecture and concrete API examples
- landing/docs should show the difference between document data and app runtime

---

## Proposed Type Areas to Add

### Responsive foundation

- `ResponsiveBreakpoint`
- `ResponsiveMode`
- `ResponsiveModeValue<T>`
- `ResponsiveValue<T>`
- `MaybeResponsiveValue<T>`
- `CanvasResponsiveConfig`
- `CanvasBreakpointDefinition`
- `CanvasBreakpointSet`

### Canvas app runtime

- `CanvasAppProps`
- `CanvasAppConfig`
- `CanvasSplashConfig`
- `CanvasProviderRegistry`
- `CanvasActionRegistry`

### Text updates

- responsive-aware `TextProps`
- extended text sizing scale

---

## Risks

1. **Type/API sprawl**
   - Keep the first public API small and staged.
2. **Inline style vs utility class conflicts**
   - Ensure `Text` typography ownership is singular and predictable.
3. **Container mode complexity**
   - Start with a practical runtime API and avoid overengineering editor UX in phase 1.
4. **Compatibility drift**
   - Preserve a migration path for existing `Canvas` usage.
5. **SSR assumptions**
   - Treat responsive matching as runtime/client-driven, with base-safe SSR output.

---

## Acceptance Criteria

Implementation is considered ready for review when:

1. `CanvasApp` exists and can act as the root runtime shell.
2. Responsive value types support viewport/container modes with preserved inactive data.
3. Breakpoint definitions are configurable at the app/root level and default sensibly.
4. `Text` supports responsive typography props and no longer depends on Tailwind classes for text sizing.
5. Landing Canvas hero uses responsive `Text` props and visually matches the intended reference more closely.
6. Provider runtime flow is centralized through the app/runtime layer.
7. Public types and examples are documented enough to support README/docs work later.

---

## Related Plans

- `planning/26-05-17-canvas-extension-contribution-model.md`

## Follow-Up Work After This Plan

1. Responsive editor field UI implementation.
2. Root breakpoint editor UI.
3. Container query adoption in additional components.
4. Provider docs and examples.
5. README buildout from this plan and implementation notes.
6. Landing/docs page content updates.

---

## Notes for Later Review

- Re-evaluate whether `CanvasApp` should become the default exported render API.
- Re-evaluate whether document-level config should be merged with app-level config or remain separate.
- Re-evaluate whether container breakpoints need a distinct default scale.
- Re-evaluate whether responsive color support should be added to `Text` in a follow-up.
- Re-evaluate whether additional primitives besides `Text` should adopt responsive props immediately after this work.
- Re-evaluate the current package-level `StudioEditor` implementation as the base for a generic `CanvasEditor`, with nova-cloud owning the studio/workspace-specific editor wrapper.
