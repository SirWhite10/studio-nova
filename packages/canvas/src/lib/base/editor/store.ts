import type { Component } from "svelte";
import { derived, get, writable } from "svelte/store";
import type { CanvasNode } from "$lib/base/canvas/types.js";
import type {
  ComponentSelection,
  EditorHistoryEntry,
  EditorMode,
  EditorSidebarMode,
  EditorState,
} from "./types.js";

/**
 * Creates a deep clone of a component definition
 */
function cloneComponent(component: CanvasNode): CanvasNode {
  return JSON.parse(JSON.stringify(component));
}

/**
 * Creates a deep clone of component definitions array
 */
function cloneComponents(components: CanvasNode[]): CanvasNode[] {
  return JSON.parse(JSON.stringify(components));
}

function isSlotSegment(segment: string): boolean {
  return segment.startsWith("slot:");
}

function getSlotName(segment: string): string | undefined {
  return segment.startsWith("slot:") ? segment.slice(5) : undefined;
}

/**
 * Find a component by path
 */
function findComponentByPath(components: CanvasNode[], path: string[]): CanvasNode | undefined {
  if (!path.length) return undefined;

  let current: CanvasNode | undefined;
  let currentComponents = components;

  for (let i = 0; i < path.length; i++) {
    const segment = path[i];
    if (isSlotSegment(segment)) {
      if (!current) return undefined;
      const slotName = getSlotName(segment);
      if (!slotName) return undefined;
      currentComponents = current.slots?.[slotName]?.children ?? [];
      continue;
    }

    const index = Number.parseInt(segment, 10);
    if (isNaN(index) || index < 0 || index >= currentComponents.length) {
      return undefined;
    }

    current = currentComponents[index];
    if (i < path.length - 1) {
      const nextSegment = path[i + 1];
      if (isSlotSegment(nextSegment)) {
        continue;
      }
      if (!current.children) return undefined;
      currentComponents = current.children;
    }
  }

  return current;
}

function getComponentCollectionByPath(
  components: CanvasNode[],
  path: string[],
  createMissing = false,
): CanvasNode[] | undefined {
  if (path.length === 0) return components;

  const lastSegment = path[path.length - 1];
  if (isSlotSegment(lastSegment)) {
    const parent = findComponentByPath(components, path.slice(0, -1));
    const slotName = getSlotName(lastSegment);
    if (!parent || !slotName) return undefined;
    if (createMissing) {
      parent.slots ??= {};
      parent.slots[slotName] ??= { children: [] };
    }
    return parent.slots?.[slotName]?.children;
  }

  const parent = findComponentByPath(components, path);
  if (!parent) return undefined;
  if (!parent.children && createMissing) {
    parent.children = [];
  }
  return parent.children;
}

function getParentPath(path: string[]): string[] {
  return path.slice(0, -1);
}

function getPathIndex(path: string[]): number | undefined {
  const index = Number.parseInt(path[path.length - 1] ?? "", 10);
  return Number.isNaN(index) ? undefined : index;
}

function assignFreshIds(component: CanvasNode): CanvasNode {
  const cloned = cloneComponent(component);

  function walk(node: CanvasNode) {
    node.id = `${node.type.replace(/\W+/g, "-").toLowerCase()}_${Math.random().toString(36).slice(2, 11)}`;
    for (const child of node.children ?? []) {
      walk(child);
    }
    for (const slot of Object.values(node.slots ?? {})) {
      for (const child of slot.children) {
        walk(child);
      }
    }
  }

  walk(cloned);
  return cloned;
}

/**
 * Update a component property by path
 */
function updateComponentProperty(
  components: CanvasNode[],
  path: string[],
  property: string,
  value: any,
): CanvasNode[] {
  const result = cloneComponents(components);
  const component = findComponentByPath(result, path);

  if (component) {
    if (!component.props) {
      component.props = {};
    }
    component.props[property] = value;
  }

  return result;
}

/**
 * Find component path in the component tree
 */
function findComponentPath(
  components: CanvasNode[],
  targetId: string,
  currentPath: string[] = [],
): string[] | null {
  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    const path = [...currentPath, i.toString()];

    if (component.id === targetId) {
      return path;
    }

    if (component.children && component.children.length > 0) {
      const childPath = findComponentPath(component.children, targetId, path);
      if (childPath) return childPath;
    }

    for (const [slotName, slot] of Object.entries(component.slots ?? {})) {
      const slotPath = findComponentPath(slot.children, targetId, [...path, `slot:${slotName}`]);
      if (slotPath) return slotPath;
    }
  }

  return null;
}

/**
 * Create editor store
 */
export function createEditorStore(initialComponents: CanvasNode[] = []) {
  function componentsEqual(left: CanvasNode[], right: CanvasNode[]) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  // Create the writable store with initial state
  const store = writable<EditorState>({
    canRedo: undefined,
    canUndo: undefined,
    mode: "edit",
    components: cloneComponents(initialComponents),
    selection: undefined,
    hoveredComponent: undefined,
    clipboard: undefined,
    history: [
      {
        components: cloneComponents(initialComponents),
        timestamp: Date.now(),
      },
    ],
    historyIndex: 0,
    sidebarMode: "docked",
    sidebarVisible: false,
    componentRegistry: {},
    isDragging: false,
  });

  // Methods to update the store
  function setMode(mode: EditorMode) {
    store.update((state) => ({ ...state, mode }));
  }

  function setSidebarMode(sidebarMode: EditorSidebarMode) {
    store.update((state) => ({ ...state, sidebarMode }));
  }

  function setSidebarVisible(sidebarVisible: boolean) {
    store.update((state) => ({ ...state, sidebarVisible }));
  }

  function setComponents(components: CanvasNode[], options: { trackHistory?: boolean } = {}) {
    const { trackHistory = true } = options;
    let changed = false;

    store.update((state) => {
      const newComponents = cloneComponents(components);
      if (componentsEqual(state.components, newComponents)) {
        return state;
      }

      changed = true;
      return {
        ...state,
        components: newComponents,
      };
    });

    if (changed && trackHistory) {
      addHistoryEntry();
    }
  }

  function setSelection(selection?: ComponentSelection) {
    store.update((state) => ({ ...state, selection }));
  }

  function setHoveredComponent(component?: CanvasNode) {
    store.update((state) => ({ ...state, hoveredComponent: component }));
  }

  function setIsDragging(isDragging: boolean) {
    store.update((state) => ({ ...state, isDragging }));
  }

  function registerComponent(name: string, component: Component) {
    store.update((state) => {
      const registry = { ...state.componentRegistry };
      registry[name] = component;
      return {
        ...state,
        componentRegistry: registry,
      };
    });
  }

  function updateProperty(path: string[], property: string, value: any) {
    store.update((state) => {
      const updatedComponents = updateComponentProperty(state.components, path, property, value);
      return {
        ...state,
        components: updatedComponents,
      };
    });
    addHistoryEntry();
  }

  function addHistoryEntry() {
    const state = get(store);
    const newEntry: EditorHistoryEntry = {
      components: cloneComponents(state.components),
      selection: state.selection,
      timestamp: Date.now(),
    };

    store.update((state) => {
      // Remove any future history if we're not at the end
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newEntry);

      return {
        ...state,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  }

  function undo() {
    store.update((state) => {
      if (state.historyIndex <= 0) return state;

      const newIndex = state.historyIndex - 1;
      const historyEntry = state.history[newIndex];

      return {
        ...state,
        historyIndex: newIndex,
        components: cloneComponents(historyEntry.components),
        selection: historyEntry.selection,
      };
    });
  }

  function redo() {
    store.update((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;

      const newIndex = state.historyIndex + 1;
      const historyEntry = state.history[newIndex];

      return {
        ...state,
        historyIndex: newIndex,
        components: cloneComponents(historyEntry.components),
        selection: historyEntry.selection,
      };
    });
  }

  function selectComponentById(id: string) {
    const state = get(store);
    const path = findComponentPath(state.components, id);

    if (path) {
      const component = findComponentByPath(state.components, path);
      if (component) {
        setSelection({
          component,
          path,
        });
      }
    }
  }

  function addComponent(component: CanvasNode, parentPath?: string[]) {
    store.update((state) => {
      const newComponents = cloneComponents(state.components);

      if (!parentPath || parentPath.length === 0) {
        // Add to root
        newComponents.push(component);
      } else {
        const collection = getComponentCollectionByPath(newComponents, parentPath, true);
        if (collection) {
          collection.push(component);
        }
      }

      return {
        ...state,
        components: newComponents,
      };
    });
    addHistoryEntry();
  }

  function deleteComponent(path: string[]) {
    if (!path.length) return;

    store.update((state) => {
      const newComponents = cloneComponents(state.components);

      if (path.length === 1) {
        // Delete from root
        const index = Number.parseInt(path[0], 10);
        if (!isNaN(index) && index >= 0 && index < newComponents.length) {
          newComponents.splice(index, 1);
        }
      } else {
        // Delete from parent
        const collection = getComponentCollectionByPath(newComponents, path.slice(0, -1));
        if (collection) {
          const index = Number.parseInt(path[path.length - 1], 10);
          if (!isNaN(index) && index >= 0 && index < collection.length) {
            collection.splice(index, 1);
          }
        }
      }

      return {
        ...state,
        components: newComponents,
        selection: undefined,
      };
    });
    addHistoryEntry();
  }

  function moveComponent(path: string[], targetIndex: number) {
    if (!path.length) return;

    store.update((state) => {
      const newComponents = cloneComponents(state.components);
      const sourceIndex = getPathIndex(path);
      if (sourceIndex === undefined) {
        return state;
      }

      const collection =
        path.length === 1
          ? newComponents
          : getComponentCollectionByPath(newComponents, getParentPath(path));

      if (!collection || sourceIndex < 0 || sourceIndex >= collection.length) {
        return state;
      }

      const boundedTargetIndex = Math.max(0, Math.min(targetIndex, collection.length - 1));
      if (boundedTargetIndex === sourceIndex) {
        return state;
      }

      const [component] = collection.splice(sourceIndex, 1);
      collection.splice(boundedTargetIndex, 0, component);

      const nextSelection =
        state.selection?.path.join("/") === path.join("/")
          ? {
              ...state.selection,
              component,
              path: [...getParentPath(path), `${boundedTargetIndex}`],
            }
          : state.selection;

      return {
        ...state,
        components: newComponents,
        selection: nextSelection,
      };
    });
    addHistoryEntry();
  }

  function copyComponent(path: string[]) {
    const state = get(store);
    const component = findComponentByPath(state.components, path);
    if (!component) return;

    store.update((current) => ({
      ...current,
      clipboard: cloneComponent(component),
    }));
  }

  function duplicateComponent(path: string[]) {
    store.update((state) => {
      const newComponents = cloneComponents(state.components);
      const collection =
        path.length === 1
          ? newComponents
          : getComponentCollectionByPath(newComponents, getParentPath(path));
      const sourceIndex = getPathIndex(path);
      if (!collection || sourceIndex === undefined || !collection[sourceIndex]) {
        return state;
      }

      const duplicated = assignFreshIds(collection[sourceIndex]);
      collection.splice(sourceIndex + 1, 0, duplicated);

      return {
        ...state,
        components: newComponents,
        selection: {
          component: duplicated,
          path: [...getParentPath(path), `${sourceIndex + 1}`],
        },
      };
    });
    addHistoryEntry();
  }

  function pasteComponent(parentPath?: string[]) {
    const state = get(store);
    if (!state.clipboard) return;
    addComponent(assignFreshIds(state.clipboard), parentPath);
  }

  // Derived stores
  const canUndo = derived(store, (store) => store.historyIndex > 0);
  const canRedo = derived(store, (store) => store.historyIndex < store.history.length - 1);

  return {
    subscribe: store.subscribe,
    setMode,
    setSidebarMode,
    setSidebarVisible,
    setComponents,
    setSelection,
    setHoveredComponent,
    setIsDragging,
    registerComponent,
    /**
     * Programmatic insertion API for agents and integrations.
     * Alias of addComponent; parentPath may target root, child arrays, or `slot:<name>` paths.
     */
    insertComponent: addComponent,
    updateProperty,
    /** Programmatic property update API for agents and integrations. Alias of updateProperty. */
    updateComponentProperty: updateProperty,
    addHistoryEntry,
    undo,
    redo,
    selectComponentById,
    addComponent,
    deleteComponent,
    moveComponent,
    copyComponent,
    duplicateComponent,
    pasteComponent,
    canUndo,
    canRedo,
  };
}

// Create and export the editor store
export const editorStore = createEditorStore();
