<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { HTMLAttributes } from "svelte/elements";

	let { ref = $bindable(null), class: className = "", showIcon = false, style = "", ...restProps }: HTMLAttributes<HTMLDivElement> & { showIcon?: boolean } = $props();
</script>

<View bind:ref data-slot="sidebar-menu-skeleton" class={className} display="flex" alignItems="center" gap={2} minHeight="2rem" paddingLeft="0.5rem" paddingRight="0.5rem" style={style} {...restProps}>
	{#if showIcon}
		<View width="1rem" height="1rem" borderRadius="0.25rem" background={canvasTheme.colors.muted} style="animation: view-ui-sidebar-pulse 1.6s ease-in-out infinite;" />
	{/if}
	<View height="0.875rem" width="70%" borderRadius="999px" background={canvasTheme.colors.muted} style="animation: view-ui-sidebar-pulse 1.6s ease-in-out infinite;" />
</View>

<style>
	@keyframes view-ui-sidebar-pulse {
		50% { opacity: 0.45; }
	}
</style>
