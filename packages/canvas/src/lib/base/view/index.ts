import ViewComponent from "./view.svelte";
import { viewCodeTemplates } from "./code-templates.js";

export {
  ViewConfig,
  type ViewProps,
  type ViewEventProps,
  type EventHandler,
  type ViewStateStyles,
  type ViewStyleProps,
} from "./view.types.js";
export * from "./view-styles.svelte.js";
export * from "./view-events.svelte.js";
export * from "./view-states.svelte.js";
export * from "./view-layout.svelte.js";
export * from "./view-theme.svelte.js";
export { viewCodeTemplates };

export {
  // ViewComponent as Root,
  ViewComponent as View,
  ViewComponent as default,
};
