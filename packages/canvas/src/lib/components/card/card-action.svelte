<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils.js";
  import * as CardPrimitive from "$lib/components/view-ui/card/index.js";

  let {
    children,
    class: className,
    style = "",
    ...restProps
  }: {
    children?: Snippet;
    class?: string;
    style?: string;
    [key: string]: unknown;
  } = $props();
</script>

<CardPrimitive.Action
  data-slot="card-action"
  class={cn(
    "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
    className,
  )}
  style={style}
  {...restProps}
>
  {@render children?.()}
</CardPrimitive.Action>
