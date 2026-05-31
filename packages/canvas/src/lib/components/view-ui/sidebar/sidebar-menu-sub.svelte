<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { HTMLAttributes } from "svelte/elements";

	let { ref = $bindable(null), class: className = "", children, style = "", ...restProps }: HTMLAttributes<HTMLDivElement> & { children?: () => any } = $props();
</script>

<View bind:ref as="ul" data-slot="sidebar-menu-sub" class={className} display="grid" gap={1} marginLeft="0.875rem" paddingLeft="0.75rem" borderLeft={`1px solid ${canvasTheme.colors.border}`} style={style} {...restProps}>
	{@render children?.()}
</View>
