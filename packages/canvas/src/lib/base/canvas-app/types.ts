import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { SvelteMap } from "svelte/reactivity";
import type {
  CanvasComponentCatalog,
  CanvasDocument,
  CanvasNode,
  CanvasProviderActions,
  CanvasProviderData,
  CanvasProviderNode,
  ComponentRegistryValue,
  RenderComponentFn,
} from "$lib/base/canvas/types.js";
import type { ResponsiveQueryState } from "$lib/base/responsive/media-query.svelte.js";
import type { CanvasResponsiveConfig } from "$lib/base/responsive/types.js";

export interface CanvasSplashConfig {
  enabled?: boolean;
  title?: string;
  description?: string;
  class?: string;
}

export interface CanvasAppConfig {
  responsive?: CanvasResponsiveConfig;
  splash?: CanvasSplashConfig;
}

export interface CanvasAppProps extends HTMLAttributes<HTMLDivElement> {
  document?: CanvasDocument;
  components?: CanvasNode[];
  providers?: CanvasProviderNode[];
  providerData?: CanvasProviderData;
  providerActions?: CanvasProviderActions;
  componentCatalog?: CanvasComponentCatalog;
  customComponents?: SvelteMap<string, ComponentRegistryValue>;
  renderComponent?: RenderComponentFn;
  config?: CanvasAppConfig;
  showSplash?: boolean;
  class?: string;
  children?: Snippet;
}

export interface CanvasAppContextValue {
  config: CanvasAppConfig;
  providerData: CanvasProviderData;
  providerActions: CanvasProviderActions;
  responsiveQueryState: ResponsiveQueryState;
}
