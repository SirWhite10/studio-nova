import { getContext, setContext } from "svelte";
import { get } from "svelte/store";
import type { CanvasNode } from "$lib/base/canvas/types.js";
import { editorStore } from "./store.js";

const EDITOR_CONTEXT_KEY = "studio-editor";

/**
 * Set the editor context
 */
export function setEditorContext(store = editorStore) {
  setContext(EDITOR_CONTEXT_KEY, store);
  return store;
}

/**
 * Get the editor context
 */
export function getEditorContext() {
  return getContext<typeof editorStore>(EDITOR_CONTEXT_KEY);
}

/**
 * Helper for component selection
 */
export function selectComponent(component: CanvasNode, path: string[]) {
  const store = getEditorContext();
  store.setSelection({ component, path });
}

/**
 * Helper for hovering component
 */
export function hoverComponent(component?: CanvasNode) {
  const store = getEditorContext();
  store.setHoveredComponent(component);
}

/**
 * Helper for updating component property
 */
export function updateComponentProperty(path: string[], property: string, value: any) {
  const store = getEditorContext();
  store.updateProperty(path, property, value);
}

/**
 * Helper to check if a component is selected
 */
export function isComponentSelected(component: CanvasNode) {
  const store = getEditorContext();
  const state = get(store);
  return state.selection?.component?.id === component.id;
}

/**
 * Helper to check if a component is hovered
 */
export function isComponentHovered(component: CanvasNode) {
  const store = getEditorContext();
  const state = get(store);
  return state.hoveredComponent?.id === component.id;
}

export function setEditorSidebarVisible(visible: boolean) {
  const store = getEditorContext();
  store.setSidebarVisible(visible);
}

export function copyEditorComponent(path: string[]) {
  const store = getEditorContext();
  store.copyComponent(path);
}

export function duplicateEditorComponent(path: string[]) {
  const store = getEditorContext();
  store.duplicateComponent(path);
}

export function pasteEditorComponent(path?: string[]) {
  const store = getEditorContext();
  store.pasteComponent(path);
}
