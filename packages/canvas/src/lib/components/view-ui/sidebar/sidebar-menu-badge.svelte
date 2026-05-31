<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { HTMLAttributes } from "svelte/elements";

	let { ref = $bindable(null), class: className = "", children, style = "", ...restProps }: HTMLAttributes<HTMLDivElement> & { children?: () => any } = $props();
</script>

<View bind:ref data-slot="sidebar-menu-badge" class={className} display="inline-flex" alignItems="center" justifyContent="center" minWidth="1.25rem" height="1.25rem" paddingLeft="0.375rem" paddingRight="0.375rem" borderRadius="999px" background={canvasTheme.colors.muted} color={canvasTheme.colors.mutedForeground} style={`font-size: 0.6875rem; font-weight: 700; ${style}`} {...restProps}>
	{@render children?.()}
</View>
