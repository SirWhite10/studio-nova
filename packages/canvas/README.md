# Canvas

Canvas is a data-driven composition and rendering system for reusable app surfaces, editors, and page-like documents.

## Why this architecture is being introduced

This direction grew out of a concrete rendering problem in the landing hero work:

- the hero was moved into a data-driven Canvas block
- its title and paragraph were modeled as Canvas `Text` nodes
- `Text` applies inline typography styles
- Tailwind typography classes on those nodes were therefore being overridden

That exposed a larger architectural need:

1. typography and responsiveness should be owned by Canvas primitives themselves
2. responsive behavior should not be hardcoded ad hoc inside individual components
3. app-level concerns such as breakpoints, providers, splash/loading behavior, and future integration/runtime state need a dedicated root above the renderer
4. the editor should have a meaningful root object to select and inspect

That is why the package is moving toward a clearer split between:

- `CanvasApp` as runtime root
- `CanvasDocument` as authored model
- `Canvas` as renderer
- `CanvasEditor` as the generic editor surface

The immediate trigger was a text sizing/responsiveness issue, but the solution necessarily expands into the broader runtime and editor model.

## Useful reference point

A useful conceptual reference is **Puck** (React), mainly because it shows a schema-driven visual editor model built around:

- a component registry
- serialized authored data
- field-schema-driven editing
- drag/drop visual composition

Canvas should borrow the _ideas_, not the framework or exact structure.

Canvas is intentionally aiming for:

- stronger separation of runtime/document/renderer/editor concerns
- support for app surfaces and provider-backed widgets, not only page-builder blocks
- a generic/default editor, not a mandatory single editor UI
- contracts that are easy for **LLMs, agents, and code harnesses** to understand from types and manifests

## Core model

Canvas is organized around three distinct layers:

1. **`CanvasApp`**
   - the top-level runtime shell
   - owns app-wide runtime concerns like responsive breakpoints, providers, splash/loading behavior, and future app/runtime configuration

2. **`CanvasDocument`**
   - the authored, serializable composition model
   - describes the nodes, props, slots, and structure being rendered
   - can represent a page, screen, route, section, or other reusable surface

3. **`Canvas`**
   - the renderer
   - receives a document, component registry, and runtime inputs
   - renders exactly what its parent gives it

## Runtime hierarchy

The intended runtime hierarchy is:

- `CanvasApp`
  - `CanvasDocument` (data/model)
  - `Canvas` (renderer)

Important:

- `CanvasApp` is **not** the first child in the document tree.
- `CanvasApp` wraps the Canvas render system from above.
- `Canvas` should stay a rendering primitive, not an app/runtime shell.
- `CanvasDocument` is conceptually above `Canvas`, even when represented as JSON/TypeScript data instead of a Svelte component.

## Editor direction

The generic editor surface in this package should evolve toward **`CanvasEditor`**.

- `CanvasEditor` should treat `CanvasApp` as the editable root selection target.
- Selecting the root in the editor should expose app/runtime fields rather than a no-op root selection.
- A product/workspace-specific editor such as **`StudioEditor`** should live in **nova-cloud**, where workspace-specific behavior can grow independently.
- The current package-level `StudioEditor` implementation is best treated as the starting point to generalize into `CanvasEditor`.
- Planned rename direction in this package:
  - `StudioEditor.svelte` → `CanvasEditor.svelte`
  - package exports and examples should follow the generic `CanvasEditor` naming
  - a temporary compatibility alias may be kept during migration if needed
- The studio/workspace editor may expose a different or expanded configuration surface than the base library editor, because nova-cloud can compose additional product-level behavior on top of the generic Canvas editor contract.

### Thought process for another developer

If this work is handed off, the intended layering is:

1. **Canvas library**
   - owns the generic rendering/runtime/editor contracts
   - should stay portable, typed, and reusable
   - should not become tightly coupled to one workspace product

2. **nova-cloud / Studio**
   - owns workspace-specific UX and product behavior
   - can wrap the generic editor and expose additional settings, flows, or controls
   - can decide which parts of the generic config to show, hide, constrain, or extend

In other words:

- `CanvasEditor` is the platform/editor primitive
- `StudioEditor` is the product/editor experience

This separation is intentional so the library can remain stable while the nova-cloud studio grows faster and more specifically.

## Responsive direction

Responsive behavior is planned to be data-driven and app-defined:

- root/app-level breakpoint definitions with sensible Tailwind-like defaults
- viewport and container responsive modes
- sparse responsive field overrides
- responsive values resolved by runtime configuration provided from `CanvasApp`

## Planning

Current implementation planning lives in:

- `planning/26-05-17-canvas-app-runtime-and-responsive-foundation.md`
- `planning/26-05-17-canvas-extension-contribution-model.md`

## Development

```sh
npm run dev
```

## Checks

```sh
npm run check
```

## Build

```sh
npm run build
```
