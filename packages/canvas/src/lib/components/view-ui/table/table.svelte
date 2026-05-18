<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import type { HTMLTableAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className = "",
		style = "",
		children,
		...restProps
	}: HTMLTableAttributes & {
		class?: string;
		children?: () => unknown;
	} = $props();
</script>

<View data-slot="table-container" as="div" position="relative" width="100%" overflowX="auto">
	<View
		bind:ref
		as="table"
		data-slot="table"
		class={className}
		width="100%"
		style={`caption-side: bottom; font-size: 0.875rem; ${style}`}
		{...restProps}
	>
		{@render children?.()}
	</View>
</View>
