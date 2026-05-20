/** biome-ignore-all lint/suspicious/noExplicitAny: cause i wanna */
import type { Component } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { SvelteMap } from "svelte/reactivity";

export interface BaseProps extends HTMLAttributes<HTMLElement> {
  id?: string;
  [key: string]: any;
}

export type CanvasNodeKind = "primitive" | "component" | "block" | "widget";

export interface CanvasBinding {
  source: string;
  path?: string[];
  mode?: "live" | "once";
  fallback?: unknown;
}

export interface CanvasActionRef {
  source: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface CanvasActionContext {
  node: CanvasNode;
  actionProp: string;
  args: unknown[];
  providerData: CanvasProviderData;
}

export type CanvasActionHandler = (
  payload: Record<string, unknown> | undefined,
  context: CanvasActionContext,
) => unknown | Promise<unknown>;

export type CanvasProviderActions = Record<string, Record<string, CanvasActionHandler>>;

export interface CanvasSlotContent<TProps extends BaseProps = BaseProps> {
  children: CanvasNode<TProps>[];
}

export interface CanvasNode<TProps extends BaseProps = BaseProps> {
  id?: string;
  type: string;
  kind?: CanvasNodeKind;
  props?: TProps;
  children?: CanvasNode<TProps>[];
  slots?: Record<string, CanvasSlotContent<TProps>>;
  bindings?: Record<string, CanvasBinding>;
  actions?: Record<string, CanvasActionRef>;
}

export interface CanvasProviderNode {
  id?: string;
  name: string;
  type: string;
  kind?: "provider";
  props?: Record<string, unknown>;
}

export interface CanvasDocument<TProps extends BaseProps = BaseProps> {
  props?: TProps;
  providers?: CanvasProviderNode[];
  components?: CanvasNode<TProps>[];
}

export type CanvasProviderData = Record<string, unknown>;

export interface CanvasSlotDefinition {
  label: string;
  description?: string;
  allowedTypes?: string[];
  allowedKinds?: CanvasNodeKind[];
  multiple?: boolean;
}

export interface CanvasComponentDefinition {
  type: string;
  component: Component<any, any, any>;
  kind?: CanvasNodeKind;
  category?: string;
  label?: string;
  description?: string;
  defaultProps?: Record<string, unknown>;
  editorConfig?: Record<string, unknown>;
  slots?: Record<string, CanvasSlotDefinition>;
  acceptsCanvasRuntime?: boolean;
}

export type CanvasComponentCatalog = Record<string, CanvasComponentDefinition>;

export type RenderComponentFn = <TProps extends BaseProps = BaseProps>(
  component: CanvasNode<TProps>,
  path?: string[],
) => any;

export type ComponentRegistryValue = Component<any, any, any>;

export interface CanvasProps extends HTMLAttributes<HTMLDivElement> {
  document?: CanvasDocument<BaseProps>;
  components?: CanvasNode<BaseProps>[];
  providers?: CanvasProviderNode[];
  providerData?: CanvasProviderData;
  providerActions?: CanvasProviderActions;
  componentCatalog?: CanvasComponentCatalog;
  class?: string;
  customComponents?: SvelteMap<string, ComponentRegistryValue>;
  renderComponent?: RenderComponentFn;
}

export type ComponentDef<TProps extends BaseProps = BaseProps> = CanvasNode<TProps>;
export type StudioCanvasProps = CanvasProps;
