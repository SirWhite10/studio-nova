<script lang="ts">
	import type { Snippet } from "svelte";
	import { View } from "$lib/base/view/index.js";
	let { ref = $bindable(null), children, class: className = "", style = "", ...restProps }: { ref?: HTMLElement | null; children?: Snippet; class?: string; style?: string; [key: string]: any } = $props();
</script>
<View bind:ref data-slot="card-description" class={className} color="var(--muted-foreground)" fontSize="0.875rem" style={`grid-column-start: 1; ${style}`} {...restProps}>{@render children?.()}</View>
