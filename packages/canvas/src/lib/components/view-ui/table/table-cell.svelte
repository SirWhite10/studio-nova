<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import type { HTMLTdAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className = "",
		style = "",
		children,
		...restProps
	}: HTMLTdAttributes & {
		class?: string;
		children?: () => unknown;
	} = $props();
</script>

<View
	bind:ref
	as="td"
	data-slot="table-cell"
	class={className}
	style={`padding: 0.5rem; vertical-align: middle; white-space: nowrap; ${style}`}
	{...restProps}
>
	{@render children?.()}
</View>
