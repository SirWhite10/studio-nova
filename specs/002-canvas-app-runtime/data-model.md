# Data Model: Canvas App Runtime

## Key Entities

### CanvasApp

**Purpose**: The top-level runtime shell for Canvas. Owns app-wide runtime concerns that should not live inside the authored document tree.

**Fields**:

- `document`: `CanvasDocument` to render
- `componentCatalog`: renderable component definitions available to the document
- `providers`: optional provider nodes
- `providerData`: app-owned provider state delivered through the runtime
- `providerActions`: app-owned actions callable from rendered nodes
- `config`: app/runtime configuration such as responsive settings, splash behavior, and theme

**Relationships**:

- Wraps `Canvas`
- Provides runtime context to `Text` and other consumers
- Remains outside the authored document structure
- Supplies app-level state to `CanvasEditor`, but is not the editor's root selection object

### CanvasDocument

**Purpose**: The authored, serializable model describing what should render.

**Fields**:

- `props`: document-level props
- `components`: top-level `CanvasNode[]`
- `providers`: optional document-level provider nodes when used by the renderer flow

**Relationships**:

- Passed into `CanvasApp`
- Rendered by `Canvas`
- Must not contain `CanvasApp` as a child node
- Acts as the editing root for document-oriented editor state

### Canvas

**Purpose**: Renderer-only primitive that turns a `CanvasDocument` plus runtime inputs into UI.

**Fields**:

- `document` or document-derived tree inputs
- `componentCatalog`
- `providerData`
- `providerActions`
- render-time customization hooks

**Relationships**:

- Receives runtime data from `CanvasApp`
- Renders `CanvasNode` trees
- Should not become the app shell itself

### Canvas Responsive Config

**Purpose**: Root-owned responsive configuration used to resolve responsive values consistently across the runtime.

**Fields**:

- `defaultMode`: `"viewport" | "container"`
- `breakpoints.viewport`: viewport breakpoint definitions
- `breakpoints.container`: container breakpoint definitions

**Relationships**:

- Stored on `CanvasAppConfig`
- Consulted by responsive resolution helpers
- Consumed by `Text` and future responsive components

### ResponsiveValue

**Purpose**: Stores responsive values for both supported modes so authored data survives mode switches.

**Fields**:

- `mode`: active mode used for resolution
- `viewport`: `ResponsiveModeValue<T>`
- `container`: `ResponsiveModeValue<T>`

**Relationships**:

- Resolved by `resolveResponsiveValue()`
- Used by `Text` and future editor field controls
- Must preserve inactive branches while another branch is rendered

### ResponsiveModeValue

**Purpose**: Sparse base-plus-overrides value structure for one responsive branch.

**Fields**:

- `base`: default value
- `overrides`: optional map of breakpoint key -> value

**Relationships**:

- Used inside `ResponsiveValue`
- Supports sparse overrides so not every breakpoint requires a value

### Responsive Query State

**Purpose**: Runtime representation of which breakpoints currently match.

**Fields**:

- `mode`: active responsive mode
- `matches`: matched breakpoints for viewport or container
- `activeBreakpoint`: highest matched breakpoint, if any

**Relationships**:

- Created by viewport/container helper utilities
- Consumed by responsive resolution helpers
- Must behave safely during SSR and hydration

### Provider Runtime

**Purpose**: Centralized runtime boundary for provider-backed data and actions.

**Fields**:

- `providerData`: record of provider namespaces to data payloads
- `providerActions`: record of provider namespaces to callable actions

**Relationships**:

- Owned by `CanvasApp`
- Routed through `Canvas`
- Read by bindings and action references in rendered nodes

### CanvasAppConfig

**Purpose**: App-level runtime configuration bundle.

**Fields**:

- `responsive`: optional `CanvasResponsiveConfig`
- `splash`: optional splash/loading configuration
- `theme`: optional theme configuration

**Relationships**:

- Passed to `CanvasApp`
- Read from app context by responsive and theme consumers
- Intended to be editable by the generic editor at the app level

### CanvasEditor

**Purpose**: Generic editor surface for the Canvas library.

**Fields**:

- `documentConfig`
- `appConfig`
- `documentEditorConfig`
- `appEditorConfig`
- `updateDocumentProperty`
- `updateAppProperty`
- editor UI state such as selection, mode, and sidebar configuration

**Relationships**:

- Edits app-level state separately from document/component state
- Should align with the `CanvasApp` / `CanvasDocument` split
- May be wrapped by product-specific editors

### StudioEditor

**Purpose**: Transitional or product-specific wrapper around the generic editor model.

**Fields**:

- wrapper-specific props and defaults

**Relationships**:

- Should not redefine the Canvas runtime model
- Exists so nova-cloud / Studio Nova can layer product behavior on top of `CanvasEditor`

## State Transitions

### Runtime Render Lifecycle

1. A route or host component creates `appConfig` / `canvasAppConfig`
2. `CanvasApp` receives the authored `CanvasDocument`
3. `CanvasApp` provides runtime context and resolves responsive/theme/provider inputs
4. `Canvas` renders the document tree using that runtime context
5. `Text` and provider-bound nodes resolve values from the runtime boundary

### Responsive Resolution Lifecycle

1. Author stores a plain value or `ResponsiveValue`
2. `CanvasApp` provides root breakpoint definitions and default mode
3. Runtime query state determines the active breakpoint for viewport or container
4. `resolveResponsiveValue()` selects the correct branch and applicable override
5. The rendered component uses the resolved scalar value

### Provider Action Lifecycle

1. `CanvasApp` receives `providerActions`
2. A rendered node references an action via a provider/action pair
3. The renderer looks up the action handler in runtime state
4. The action executes with current provider data and invocation context
5. Provider-backed UI updates without mutating the authored document structure

### Editor App-Level Edit Lifecycle

1. `CanvasEditor` is given `appConfig`, `appEditorConfig`, and `updateAppProperty`
2. User enters an app-level inspector flow
3. Editor renders app-level fields instead of component-level fields
4. Updates call `updateAppProperty`
5. Host state updates, which may rebuild `canvasAppConfig` or related runtime values

## Editor Root Decision

For `002`, the root decision is now explicit:

- `CanvasDocument` is the editing root
- `CanvasApp` is the runtime shell

App-level editing may still exist in dedicated editor flows, but it should not redefine editor selection semantics such that `CanvasApp` becomes the document root.
