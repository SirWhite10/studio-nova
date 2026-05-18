import { getContext, setContext } from "svelte";

export type ToggleGroupContext = {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  spacing?: number;
  orientation?: "horizontal" | "vertical";
};

const TOGGLE_GROUP_KEY = "canvas-toggle-group";

export function setToggleGroupCtx(context: ToggleGroupContext) {
  setContext(TOGGLE_GROUP_KEY, context);
}

export function getToggleGroupCtx() {
  return getContext<ToggleGroupContext>(TOGGLE_GROUP_KEY);
}
