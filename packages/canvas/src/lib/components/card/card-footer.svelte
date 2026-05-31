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

<CardPrimitive.Footer
  data-slot="card-footer"
  class={cn(
    "flex items-center px-6 group-data-[size=sm]/card:px-4",
    className,
  )}
  style={style}
  {...restProps}
>
  {@render children?.()}
</CardPrimitive.Footer>
