<script lang="ts">
	import type { Snippet } from "svelte";
	import { View } from "$lib/base/view/index.js";
	let { ref = $bindable(null), children, class: className = "", style = "", ...restProps }: { ref?: HTMLElement | null; children?: Snippet; class?: string; style?: string; [key: string]: any } = $props();
</script>
<View bind:ref data-slot="card-title" class={className} fontSize="1rem" lineHeight="1.5" fontWeight="500" style={`grid-column-start: 1; ${style}`} {...restProps}>{@render children?.()}</View>
