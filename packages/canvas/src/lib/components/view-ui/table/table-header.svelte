<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className = "",
		style = "",
		children,
		...restProps
	}: HTMLAttributes<HTMLTableSectionElement> & {
		class?: string;
		children?: () => unknown;
	} = $props();
</script>

<View
	bind:ref
	as="thead"
	data-slot="table-header"
	class={className}
	style={`border-bottom: 1px solid ${canvasTheme.colors.border}; ${style}`}
	{...restProps}
>
	{@render children?.()}
</View>
