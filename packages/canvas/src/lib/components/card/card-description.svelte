<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils.js";
  import * as CardPrimitive from "$lib/components/view-ui/card/index.js";
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

<CardPrimitive.Description
  data-slot="card-description"
  class={cn("col-start-1 text-sm text-muted-foreground", className)}
  style={style}
  {...restProps}
>
  {#if children}
    {@render children()}
  {:else}
    {text}
  {/if}
</CardPrimitive.Description>
