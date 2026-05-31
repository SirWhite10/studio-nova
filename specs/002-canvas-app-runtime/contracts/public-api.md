# Public API Contract: Canvas App Runtime

## Purpose

Define the runtime boundary and import/export contract so that:

1. `CanvasApp` remains the runtime shell
2. `CanvasDocument` remains the authored serializable model
3. `Canvas` remains the renderer
4. responsive and provider behavior flow through the app/runtime layer
5. the generic editor aligns with that architecture instead of redefining it

## Conceptual Contract

### Runtime Hierarchy

```text
CanvasApp
  └── CanvasDocument
        └── Canvas
```

Interpretation:

- `CanvasApp` owns runtime concerns
- `CanvasDocument` owns authored structure/content
- `Canvas` renders authored structure using runtime inputs

## Public Exports

The Canvas package should expose, at minimum:

```typescript
// Runtime root
export { default as CanvasApp } from "./base/canvas-app/CanvasApp.svelte";

// Renderer
export { default as Canvas } from "./base/canvas/canvas.svelte";

// Responsive foundation
export {
  CONTAINER_BREAKPOINTS,
  VIEWPORT_BREAKPOINTS,
  createContainerBreakpointState,
  createResponsiveQueryState,
  createViewportBreakpointState,
  createResponsiveValue,
  resolveResponsiveModeValue,
  resolveResponsiveValue,
} from "./base/responsive/*";

// Types
export type { CanvasDocument, CanvasNode, CanvasProviderActions } from "./base/canvas/types.js";

export type { CanvasAppConfig, CanvasAppContextValue } from "./base/canvas-app/types.js";

export type {
  CanvasResponsiveConfig,
  ResponsiveModeValue,
  ResponsiveValue,
} from "./base/responsive/types.js";
```

## Allowed Responsibilities

### `CanvasApp` MAY

- own app-level responsive configuration
- own splash/loading configuration
- own theme/runtime configuration
- own provider data and provider actions
- provide runtime context to downstream consumers
- expose app-level configuration for dedicated editor flows without becoming the editor root

### `CanvasApp` MUST NOT

- be serialized as part of the authored document tree
- become the first child node of `CanvasDocument`
- redefine authored component structure

### `CanvasDocument` MAY

- store document props
- store the component tree
- store serialized authored composition data

### `CanvasDocument` MUST NOT

- own runtime-only responsive query state
- own provider runtime plumbing as its primary abstraction
- contain `CanvasApp` as a node

### `Canvas` MAY

- render nodes
- resolve bindings
- invoke provider-backed actions from runtime inputs

### `Canvas` MUST NOT

- become the app shell
- define app-owned breakpoint defaults internally as the source of truth

## Responsive Value Contract

### Stored Value Shape

Responsive values must support both modes without losing data when the active mode changes.

```typescript
type ResponsiveValue<T> = {
  mode: "viewport" | "container";
  viewport: ResponsiveModeValue<T>;
  container: ResponsiveModeValue<T>;
};

type ResponsiveModeValue<T> = {
  base: T;
  overrides?: Record<string, T>;
};
```

### Contract Rules

1. Both `viewport` and `container` branches must be preservable in stored data.
2. Resolution must use app/root breakpoint config rather than component-local hardcoded thresholds.
3. Sparse overrides must be supported.
4. The inactive branch must survive editing and mode switches unchanged.

## Text Contract

The `Text` primitive must support responsive ownership for at least:

- `size`
- `weight`
- `lineHeight`
- `letterSpacing`
- `textAlign`

Rules:

1. Typography must be resolved from responsive props and runtime config.
2. Classes remain allowed for non-typography concerns.
3. Components should not rely on Tailwind typography utilities as the primary typography source once text is rendered by Canvas `Text`.

## Provider Runtime Contract

Rules:

1. Provider data and actions should be supplied at the `CanvasApp` boundary.
2. Rendered nodes may consume provider-backed bindings and actions through the existing runtime pipeline.
3. Provider runtime should not require authored document structure changes.

## Editor Contract

### Generic Editor

`CanvasEditor` is the generic package-level editor surface.

It should be able to accept:

- `appConfig`
- `appEditorConfig`
- `updateAppProperty`
- `documentConfig`
- `documentEditorConfig`
- `updateDocumentProperty`

### Product Wrapper

`StudioEditor` may exist as a wrapper/alias/product-specific layer, but it must not redefine the base runtime model.

## Editor Root Contract

The editor root contract is:

- `CanvasDocument` is the editing root
- `CanvasApp` is the runtime shell
- app-level editing is supported through dedicated app/document inspector flows
- the editor store does not need to model `CanvasApp` as the document root selection target
