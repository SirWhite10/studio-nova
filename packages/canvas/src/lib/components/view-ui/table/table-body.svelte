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

<View bind:ref as="tbody" data-slot="table-body" class={className} style={style} {...restProps}>
	{@render children?.()}
</View>
