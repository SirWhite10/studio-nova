# Data Model: Canvas Editor Rebuild

## Key Entities

### View-UI Component

**Purpose**: Data-driven Svelte component that renders using `<View>` for all layout, accepts JSON-serializable props, produces inline CSS only.

**Fields**:

- `props`: JSON-serializable component properties (strings, numbers, booleans, objects, arrays)
- `children`: Slot content (rendered via `{@render children?.()}`)
- `class`: Optional CSS class escape hatch
- `style`: Optional inline style override

**Relationships**:

- Composes one or more `<View>` instances internally
- Has a corresponding `shadcn Reference Component` defining its visual spec
- May be registered in the `Component Registry` for canvas rendering

### shadcn Reference Component

**Purpose**: Tailwind-based component that serves as the frozen visual specification.

**Fields**:

- `className`: Tailwind classes defining the visual appearance
- `children`: Slot content
- Component-specific props

**Relationships**:

- One-to-one mapping with a `View-UI Component`
- NOT imported at runtime — only read by developers/tools for visual translation

### Canvas Node

**Purpose**: Serializable data model for a rendered component on the canvas.

**Fields**:

- `id`: Unique identifier (`type_randomString`)
- `type`: Component type string (must match registry key)
- `props`: Component-specific properties (serializable)
- `children`: Nested `CanvasNode[]` for child components
- `slots`: `Record<string, { children: CanvasNode[] }>` for named slot content

**Relationships**:

- Rendered by the Canvas renderer using the `Component Registry`
- Managed by the `Editor Store` for CRUD operations
- Selected via `Component Selection` paths
- Serialized to JSON for persistence and AI agent consumption

### Editor Store

**Purpose**: Central Svelte 5 reactive store managing editor state.

**Fields**:

- `components`: `CanvasNode[]` — the component tree
- `selection`: `ComponentSelection | undefined` — currently selected node
- `history`: `EditorHistoryEntry[]` — undo/redo snapshots
- `historyIndex`: number — current position in history
- `mode`: `"edit" | "preview"` — editor mode
- `sidebarMode`: `"docked" | "floating"` — sidebar display mode
- `registeredComponents`: `SvelteMap<string, Component>` — component registry

**Key Methods**:

- `setComponents(nodes, options)` — replace component tree
- `insertComponent(type, path, index)` — insert new node
- `removeComponent(path)` — delete node
- `updateComponentProperty(path, property, value)` — edit node props
- `moveComponent(fromPath, toPath, toIndex)` — reorder/move
- `duplicateComponent(path)` — clone node
- `setSelection(selection)` — select/deselect
- `undo()` / `redo()` — history navigation
- `registerComponent(name, component)` — add to registry

**Relationships**:

- Provided via Svelte context (`setEditorContext`)
- Consumed by all editor UI components
- Drives the Canvas renderer

### Component Selection

**Purpose**: Identifies a specific node in the component tree for editing.

**Fields**:

- `path`: `string[]` — array of indices and slot keys navigating the tree (e.g., `["0", "slot:content", "2"]`)
- `component`: The resolved `CanvasNode` at that path

**Relationships**:

- Stored in `Editor Store` selection state
- Used by inspector to determine which fields to render
- Used by canvas to determine which overlay to show

### Component Registry Entry

**Purpose**: Maps a component type string to its implementation and editor config.

**Fields**:

- `type`: string — registry key (e.g., `"view"`, `"card"`, `"button"`)
- `component`: Svelte Component — the actual renderable component
- `catalogEntry`: `StudioComponentBaseConfig` — editor config with props defaults, field schemas, field groups

**Relationships**:

- Lookup by `CanvasNode.type` during rendering
- Drives the component palette in the editor sidebar
- Drives the inspector fields for selected components

### Editor Config (Field Schema)

**Purpose**: Defines what props a component exposes and how to edit them in the inspector.

**Fields**:

- `props`: Default prop values
- `editorConfig.fields`: `Record<string, FieldDefinition>` — maps prop name to field type + options
- `editorConfig.groups`: `Record<string, { label, fields[] }>` — groups fields in the inspector UI

**Field Types**:

- `text`, `textarea`, `number`, `select`, `color`, `spacing`, `size`, `boolean`
- `array` (repeater), `object` (nested fields), `icon`, `image`, `link`, `richtext`

**Relationships**:

- Defined per component in its `*Config` export
- Consumed by `AutoField` / field renderers in the inspector

## State Transitions

### Editor Lifecycle

1. `CanvasEditor` mounts → creates `Editor Store` → provides via context
2. `components` prop → `store.setComponents()` → renders Canvas
3. User clicks component → `store.setSelection()` → inspector renders fields
4. User edits field → `store.updateComponentProperty()` → re-renders Canvas
5. `onChange` callback fires → parent component receives updated tree

### Component Insertion

1. User drags from palette → `store.insertComponent(type, path, index)`
2. Store creates new `CanvasNode` with `assignFreshIds()`
3. Store inserts at path, tracks history
4. Canvas re-renders with new node

### History

1. Every mutation (insert, remove, update, move, duplicate) records pre-mutation state
2. `undo()` decrements `historyIndex`, restores state
3. `redo()` increments `historyIndex`, restores state
4. `setUi` and `registerZone` do NOT track history
