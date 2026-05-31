<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { HTMLAttributes } from "svelte/elements";

	let { ref = $bindable(null), class: className = "", children, style = "", ...restProps }: HTMLAttributes<HTMLDivElement> & { children?: () => any } = $props();
</script>

<View bind:ref data-slot="dropdown-menu-group-heading" class={className} paddingTop="0.375rem" paddingBottom="0.25rem" paddingLeft="0.5rem" paddingRight="0.5rem" color={canvasTheme.colors.mutedForeground} style={`font-size: 0.75rem; font-weight: 600; ${style}`} {...restProps}>{@render children?.()}</View>
