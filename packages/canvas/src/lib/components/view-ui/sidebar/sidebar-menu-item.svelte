<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import type { HTMLAttributes } from "svelte/elements";

	let { ref = $bindable(null), children, style = "", ...restProps }: HTMLAttributes<HTMLLIElement> & { children?: () => any } = $props();
</script>

<View
	as="li"
	bind:ref
	data-slot="sidebar-menu-item"
	data-sidebar="menu-item"
	position="relative"
	style={style}
	{...restProps}
>
	{@render children?.()}
</View>
