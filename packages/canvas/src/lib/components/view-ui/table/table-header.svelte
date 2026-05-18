<script lang="ts">
	import { View } from "$lib/base/view/index.js";
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
	style={`border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent); ${style}`}
	{...restProps}
>
	{@render children?.()}
</View>
