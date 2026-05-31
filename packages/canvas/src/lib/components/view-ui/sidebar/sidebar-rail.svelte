<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { HTMLAttributes } from "svelte/elements";

	let { ref = $bindable(null), class: className = "", children, style = "", ...restProps }: HTMLAttributes<HTMLDivElement> & { children?: () => any } = $props();
</script>

<View bind:ref as="button" data-slot="sidebar-rail" class={className} aria-label="Toggle Sidebar" width="0.5rem" height="100%" background="transparent" border="0" style={`position: absolute; inset-block: 0; inset-inline-end: -0.25rem; cursor: ew-resize; ${style}`} {...restProps}>
	{@render children?.()}
</View>
