# Canvas AI Agent API

This package exposes a data-first editor model so agents can construct, edit, serialize, and hydrate pages without driving the visual editor UI.

## Public entrypoints

Import the store factory and shared editor store from the canvas package root or from the editor module:

```ts
import { createEditorStore, editorStore, canvasComponentCatalog } from "canvas";
// or: import { createEditorStore } from "canvas/src/lib/base/editor" inside the repo
```

Use `createEditorStore(initialComponents?)` for isolated agent work. `editorStore` is the shared singleton used by editor UI modules.

## Store methods for page construction

The store implements Svelte's readable store contract (`subscribe`) and exposes these agent-safe construction/editing methods:

- `setComponents(components, options?)`: replace the full root `CanvasNode[]` tree. Components are deep-cloned before storage. `options.trackHistory` defaults to `true`.
- `insertComponent(component, parentPath?)`: append a node to the root, to another node's `children`, or to a named slot. This is an alias for the legacy UI method `addComponent`.
- `updateComponentProperty(path, property, value)`: set `node.props[property]` at a path. This is an alias for the legacy UI method `updateProperty`.
- `deleteComponent(path)`, `moveComponent(path, targetIndex)`, `duplicateComponent(path)`: structural edits that also record history.
- `selectComponentById(id)`, `setSelection(selection?)`: selection helpers for editor-aware workflows.
- `undo()`, `redo()`: history navigation.

Paths are arrays of string segments. Numeric segments select a child index. `slot:<name>` switches traversal into a named slot's `children` array. Examples:

- `["0"]`: first root component.
- `["2", "0"]`: first child of the third root component.
- `["2", "0", "slot:header"]`: the `header` slot children collection on that card node.
- `["2", "0", "slot:header", "0", "0"]`: first child of the first node in that slot.

## CanvasNode schema

A serializable page is a `CanvasNode[]` tree, usually stored on `CanvasDocument.components`.

```ts
interface CanvasNode {
  id?: string;
  type: string;
  kind?: "primitive" | "component" | "block" | "widget";
  props?: Record<string, unknown>;
  children?: CanvasNode[];
  slots?: Record<string, { children: CanvasNode[] }>;
  bindings?: Record<string, CanvasBinding>;
  actions?: Record<string, CanvasActionRef>;
}
```

Serialization is plain JSON:

```ts
const json = JSON.stringify(get(store).components);
const components = JSON.parse(json) as CanvasNode[];
const nextStore = createEditorStore(components);
```

## Component catalog structure

`canvasComponentCatalog` maps component type names to component definitions:

```ts
interface CanvasComponentDefinition {
  type: string;
  component: Component;
  kind?: CanvasNode["kind"];
  category?: string;
  label?: string;
  description?: string;
  defaultProps?: Record<string, unknown>;
  editorConfig?: EditorConfig;
  slots?: Record<string, CanvasSlotDefinition>;
  acceptsCanvasRuntime?: boolean;
}
```

Agents should use `type`, `kind`, `defaultProps`, `editorConfig`, and `slots` to decide which nodes can be created and where they may be inserted. Runtime-only `component` values are not serializable and should not be copied into `CanvasNode` JSON.

Current bundled examples include primitives (`View`, `Text`), blocks (`Hero.1`), and card components (`Card.Root`, `Card.Header`, `Card.Title`, `Card.Description`, `Card.Content`, `Card.Footer`).

## Field schema

Editable props are described by each catalog entry's `editorConfig.fields`. Field configs are discriminated by `type`:

- `text`, `number`, `boolean`, `select`, `color`, `spacing`, `size`
- `array`, `object`
- `link`, `image`, `icon`, `richtext`

Common field metadata includes `label`, `description`, `required`, `default`, `showIf`, and `onChange`. Agents can use these definitions to choose valid prop keys and default values when creating nodes.

## Minimal agent construction example

```ts
import { get } from "svelte/store";
import { createEditorStore } from "canvas";

const store = createEditorStore();

store.insertComponent({
  id: "hero",
  type: "Hero.1",
  kind: "block",
  props: { titleText: "AI-built landing page" },
});

store.insertComponent({
  id: "grid",
  type: "View",
  kind: "primitive",
  props: { class: "grid gap-4 md:grid-cols-3" },
});

store.insertComponent({ id: "card-1", type: "Card.Root", kind: "component" }, ["1"]);
store.insertComponent({ id: "card-1-header", type: "Card.Header", kind: "component" }, [
  "1",
  "0",
  "slot:header",
]);
store.insertComponent(
  { id: "card-1-title", type: "Card.Title", kind: "component", props: { text: "Fast" } },
  ["1", "0", "slot:header", "0"],
);

store.updateComponentProperty(["0"], "titleText", "Edited by an agent");

const json = JSON.stringify(get(store).components);
```
