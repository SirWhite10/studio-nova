<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { HTMLThAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className = "",
		style = "",
		children,
		...restProps
	}: HTMLThAttributes & {
		class?: string;
		children?: () => unknown;
	} = $props();
</script>

<View
	bind:ref
	as="th"
	data-slot="table-head"
	class={className}
	color={canvasTheme.colors.foreground}
	textAlign="left"
	style={`height: 2.5rem; white-space: nowrap; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; padding: 0.5rem; vertical-align: middle; ${style}`}
	{...restProps}
>
	{@render children?.()}
</View>
