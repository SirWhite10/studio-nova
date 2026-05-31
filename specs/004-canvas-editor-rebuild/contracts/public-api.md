# Public API Contract: Canvas Editor Rebuild

## Purpose

Define the component surface and import contract so that:

1. No runtime code imports from `shadcn-components/`
2. All UI components come from `view-ui/`
3. The editor exposes a clean programmatic API for AI agents

## Import Rules

### ✅ Allowed Imports

- `$lib/components/view-ui/*` — canonical UI components
- `$lib/base/view/` — View primitive
- `$lib/base/text/` — Text primitive
- `$lib/base/canvas/` — Canvas renderer
- `$lib/base/canvas-app/` — CanvasApp runtime
- `$lib/base/editor/` — Editor shell, store, context, fields
- `$lib/base/theme/` — Theme provider
- `$lib/base/responsive/` — Breakpoints

### ❌ Forbidden Imports (at runtime)

- `$lib/shadcn-components/*` — reference only, not for runtime
- `$lib/components/ui/*` — deleted
- `tailwindcss` — not used in component output

### 🔍 Reference Only (build-time, not imported)

- `$lib/shadcn-components/ui/*` — read by developers/AI to determine visual spec, never imported in Svelte files

## Component Surface

### View-UI Components (21+ after Phase 1)

**Existing (13):**

- `avatar/`, `badge/`, `button/`, `card/`, `chart/`, `dropdown-menu/`, `label/`, `select/`, `separator/`, `sidebar/`, `table/`, `tabs/`, `toggle-group/`

**New (8):**

- `input/`, `textarea/`, `checkbox/`, `switch/`, `progress/`, `accordion/`, `dialog/`, `command/`

**Each component exports:**

- Default or named component export
- TypeScript props interface
- `index.ts` barrel file

### Editor Public API

```typescript
// Store creation
createEditorStore(initialComponents: CanvasNode[]): EditorStore

// Context
setEditorContext(store: EditorStore): EditorStore

// Store methods
store.setComponents(nodes: CanvasNode[], options?: { trackHistory?: boolean }): void
store.insertComponent(type: string, path: string[], index: number): void
store.removeComponent(path: string[]): void
store.updateComponentProperty(path: string[], property: string, value: any): void
store.moveComponent(fromPath: string[], toPath: string[], toIndex: number): void
store.duplicateComponent(path: string[]): void
store.setSelection(selection: ComponentSelection | undefined): void
store.registerComponent(name: string, component: Component): void
store.undo(): void
store.redo(): void
store.setMode(mode: "edit" | "preview"): void
store.setSidebarMode(mode: "docked" | "floating"): void

// Component registration
componentCatalog: Record<string, StudioComponentBaseConfig>
componentRegistry: Record<string, Component>

// Editor component
<CanvasEditor
  document?: CanvasDocument
  components={CanvasNode[]}
  componentCatalog={catalog}
  componentRegistry={registry}
  mode={"edit" | "preview"}
  sidebarMode={"docked" | "floating"}
  onChange={(components: CanvasNode[]) => void}
  renderComponent?: {(node: CanvasNode) => Component}
/>
```

## Contract Rules

1. No file under `view-ui/` MAY import from `shadcn-components/`.
2. No file under `base/` MAY import from `shadcn-components/`.
3. All view-ui components MUST use `<View>` from `base/view/` for layout.
4. All view-ui components MUST use `canvasTheme` tokens for colors.
5. All view-ui component props MUST be JSON-serializable (no functions, class references, or Svelte components in props).
6. The editor store MUST support programmatic construction without UI interaction.
7. `CanvasNode` serialization to/from JSON MUST be lossless.
