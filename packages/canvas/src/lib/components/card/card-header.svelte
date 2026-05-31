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

<CardPrimitive.Header
  data-slot="card-header"
  class={cn(
    "group/card-header grid auto-rows-min items-start gap-1 px-6",
    "has-[*[data-slot=card-action]]:grid-cols-[1fr_auto] has-[*[data-slot=card-description]]:grid-rows-[auto_auto]",
    "group-data-[size=sm]/card:px-4",
    className,
  )}
  style={style}
  {...restProps}
>
  {@render children?.()}
</CardPrimitive.Header>
