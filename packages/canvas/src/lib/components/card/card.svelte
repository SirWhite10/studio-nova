<script lang="ts">
  import type { Snippet } from "svelte";
  import { SvelteMap } from "svelte/reactivity";
  import CanvasRenderNodes from "$lib/base/canvas/render-nodes.svelte";
  import type {
    BaseProps,
    CanvasComponentCatalog,
    CanvasNode,
    CanvasProviderActions,
    CanvasProviderData,
    ComponentRegistryValue,
    RenderComponentFn,
  } from "$lib/base/canvas/types.js";
  import { cn } from "$lib/utils.js";
  import * as CardPrimitive from "$lib/components/ui/card/index.js";
  import { executeCardTapActions, hasCardTapActions } from "./actions.js";
  import type { CardAction, CardRootProps, CardSize, CardVariant } from "./schema.js";

  let {
    children,
    class: className,
    style = "",
    size = "default",
    variant = "default",
    interactive = false,
    disabled = false,
    href,
    target,
    rel,
    actions = [],
    onclick,
    onkeydown,
    nodePath = [],
    nodeSlots = {},
    componentCatalog = {},
    customComponents = new SvelteMap<string, ComponentRegistryValue>(),
    providerData = {},
    providerActions = {},
    renderComponent = undefined,
    ...restProps
  }: CardRootProps & {
    children?: Snippet;
    class?: string;
    size?: CardSize;
    variant?: CardVariant;
    actions?: CardAction[];
    onclick?: (event: MouseEvent) => unknown;
    onkeydown?: (event: KeyboardEvent) => unknown;
    nodePath?: string[];
    nodeSlots?: Record<string, CanvasNode[]>;
    componentCatalog?: CanvasComponentCatalog;
    customComponents?: SvelteMap<string, ComponentRegistryValue>;
    providerData?: CanvasProviderData;
    providerActions?: CanvasProviderActions;
    renderComponent?: RenderComponentFn;
  } = $props();

  const hasNamedSlots = $derived(
    Object.values(nodeSlots).some((nodes) => nodes.length > 0),
  );

  const isInteractive = $derived(
    hasCardTapActions({
      actions,
      href,
      interactive: interactive || variant === "interactive",
      onclick,
    }) && !disabled,
  );

  const runtimeNode = $derived<CanvasNode<BaseProps>>({
    type: "Card.Root",
    props: {
      ...restProps,
      size,
      variant,
      interactive,
      disabled,
      href,
      target,
      rel,
    },
    slots: Object.fromEntries(
      Object.entries(nodeSlots).map(([slotName, slotChildren]) => [slotName, { children: slotChildren }]),
    ),
  });

  async function handleClick(event: MouseEvent) {
    onclick?.(event);

    if (event.defaultPrevented || disabled || !isInteractive) {
      return;
    }

    await executeCardTapActions({
      node: runtimeNode,
      actions,
      href,
      target,
      rel,
      providerActions,
      providerData,
    });
  }

  async function handleKeydown(event: KeyboardEvent) {
    onkeydown?.(event);

    if (event.defaultPrevented || disabled || !isInteractive) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();

    await executeCardTapActions({
      node: runtimeNode,
      actions,
      href,
      target,
      rel,
      providerActions,
      providerData,
    });
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<CardPrimitive.Root
  data-slot="card"
  data-size={size}
  data-variant={variant}
  data-disabled={disabled ? "true" : "false"}
  class={cn(
    "group/card bg-card text-card-foreground flex flex-col overflow-hidden rounded-xl border py-6 text-sm",
    "border-black/10 shadow-xs gap-6 has-[>img:first-child]:pt-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
    size === "sm" && "gap-4 py-4",
    variant === "outline" && "shadow-none",
    variant === "elevated" && "shadow-sm",
    (variant === "interactive" || interactive) && !disabled && "cursor-pointer transition-shadow duration-150 hover:shadow-sm",
    disabled && "cursor-not-allowed opacity-60",
    className,
  )}
  style={style}
  role={isInteractive ? (href ? "link" : "button") : undefined}
  tabindex={isInteractive ? 0 : undefined}
  aria-disabled={disabled ? "true" : undefined}
  onclick={handleClick}
  onkeydown={handleKeydown}
  {...restProps}
>
  {#if hasNamedSlots}
    {#if nodeSlots.header?.length}
      <CanvasRenderNodes
        nodes={nodeSlots.header}
        basePath={[...nodePath, "slot:header"]}
        {componentCatalog}
        {customComponents}
        {providerData}
        {providerActions}
        {renderComponent}
      />
    {/if}
    {#if nodeSlots.content?.length}
      <CanvasRenderNodes
        nodes={nodeSlots.content}
        basePath={[...nodePath, "slot:content"]}
        {componentCatalog}
        {customComponents}
        {providerData}
        {providerActions}
        {renderComponent}
      />
    {/if}
    {#if nodeSlots.footer?.length}
      <CanvasRenderNodes
        nodes={nodeSlots.footer}
        basePath={[...nodePath, "slot:footer"]}
        {componentCatalog}
        {customComponents}
        {providerData}
        {providerActions}
        {renderComponent}
      />
    {/if}
  {:else}
    {@render children?.()}
  {/if}
</CardPrimitive.Root>
