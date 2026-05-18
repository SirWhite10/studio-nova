<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import type { HTMLAttributes } from "svelte/elements";

	let { ref = $bindable(null), children, style = "", ...restProps }: HTMLAttributes<HTMLUListElement> & { children?: () => any } = $props();
</script>

<View
	as="ul"
	bind:ref
	data-slot="sidebar-menu"
	data-sidebar="menu"
	display="flex"
	flexDirection="column"
	width="100%"
	minWidth="0"
	gap={1}
	style={`list-style: none; margin: 0; padding: 0; ${style}`}
	{...restProps}
>
	{@render children?.()}
</View>
