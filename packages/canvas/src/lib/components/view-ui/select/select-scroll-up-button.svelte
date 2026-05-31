<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { HTMLAttributes } from "svelte/elements";

	let { ref = $bindable(null), class: className = "", children, style = "", ...restProps }: HTMLAttributes<HTMLDivElement> & { children?: () => any } = $props();
</script>

<View bind:ref data-slot="select-scroll-up-button" class={className} display="flex" alignItems="center" justifyContent="center" minHeight="1.5rem" color={canvasTheme.colors.mutedForeground} style={`font-size: 0.75rem; ${style}`} {...restProps}>▲</View>
