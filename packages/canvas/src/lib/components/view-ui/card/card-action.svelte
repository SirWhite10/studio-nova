<script lang="ts">
	import type { Snippet } from "svelte";
	import { View } from "$lib/base/view/index.js";
	let { ref = $bindable(null), children, class: className = "", style = "", ...restProps }: { ref?: HTMLElement | null; children?: Snippet; class?: string; style?: string; [key: string]: any } = $props();
</script>
<View bind:ref data-slot="card-action" class={className} style={`grid-column-start: 2; grid-row: span 2 / span 2; grid-row-start: 1; align-self: start; justify-self: end; ${style}`} {...restProps}>{@render children?.()}</View>
