<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { HTMLAttributes } from "svelte/elements";

	let { ref = $bindable(null), class: className = "", children, style = "", ...restProps }: HTMLAttributes<HTMLDivElement> & { children?: () => any } = $props();
</script>

<View bind:ref as="li" data-slot="sidebar-menu-sub-item" class={className} style={style} {...restProps}>
	{@render children?.()}
</View>
