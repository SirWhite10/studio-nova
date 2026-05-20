import CanvasThemeModeSwitcher from "./CanvasThemeModeSwitcher.svelte";
import GlobalModeSwitcher from "./GlobalModeSwitcher.svelte";
import ThemeProvider from "./ThemeProvider.svelte";

export { CanvasThemeModeSwitcher, GlobalModeSwitcher, ThemeProvider };
export { getThemeContext, setThemeContext } from "./theme-store.svelte.js";
export { defaultCanvasTheme, generateThemeVariables, resolveCanvasTheme } from "./types.js";
export type {
  CanvasResolvedThemeMode,
  CanvasThemeConfig,
  CanvasThemeMode,
  CanvasThemeVariables,
} from "./types.js";

export default ThemeProvider;
