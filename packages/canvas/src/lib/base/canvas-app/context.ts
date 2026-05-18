import { getContext, setContext } from "svelte";
import type { CanvasAppContextValue } from "./types.js";

const CANVAS_APP_CONTEXT_KEY = "canvas-app";

export function setCanvasAppContext(value: CanvasAppContextValue) {
  setContext(CANVAS_APP_CONTEXT_KEY, value);
  return value;
}

export function getCanvasAppContext() {
  return getContext<CanvasAppContextValue | undefined>(CANVAS_APP_CONTEXT_KEY);
}
