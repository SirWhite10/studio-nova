import { getContext, setContext } from "svelte";
import type { CanvasResolvedThemeMode, CanvasThemeMode, CanvasThemeVariables } from "./types.js";

export interface CanvasThemeContextValue {
  mode: CanvasThemeMode;
  resolvedMode: CanvasResolvedThemeMode;
  light: Partial<CanvasThemeVariables>;
  dark: Partial<CanvasThemeVariables>;
  active: Partial<CanvasThemeVariables>;
  setMode: (mode: CanvasThemeMode) => void;
}

const THEME_CONTEXT_KEY = "canvas-theme";

export function setThemeContext(value: CanvasThemeContextValue) {
  setContext(THEME_CONTEXT_KEY, value);
  return value;
}

export function getThemeContext() {
  return getContext<CanvasThemeContextValue | undefined>(THEME_CONTEXT_KEY);
}
