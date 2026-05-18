import CanvasApp from "./CanvasApp.svelte";
import { getCanvasAppContext, setCanvasAppContext } from "./context.js";

export { CanvasApp, getCanvasAppContext, setCanvasAppContext };
export type {
  CanvasAppConfig,
  CanvasAppContextValue,
  CanvasAppProps,
  CanvasSplashConfig,
} from "./types.js";

export default CanvasApp;
