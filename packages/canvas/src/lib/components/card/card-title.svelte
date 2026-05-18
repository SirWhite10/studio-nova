<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils.js";
  import * as CardPrimitive from "$lib/components/ui/card/index.js";
  import type { CardTextProps } from "./schema.js";

  let {
    children,
    class: className,
    text,
    style = "",
    ...restProps
  }: CardTextProps & {
    children?: Snippet;
    class?: string;
    style?: string;
  } = $props();
</script>

<CardPrimitive.Title
  data-slot="card-title"
  class={cn(
    "col-start-1 text-base leading-normal font-medium group-data-[size=sm]/card:text-sm",
    className,
  )}
  style={style}
  {...restProps}
>
  {#if children}
    {@render children()}
  {:else}
    {text}
  {/if}
</CardPrimitive.Title>
