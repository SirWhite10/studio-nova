<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import type { HTMLAttributes } from "svelte/elements";

	let { ref = $bindable(null), children, style = "", ...restProps }: HTMLAttributes<HTMLDivElement> & { children?: () => any } = $props();
</script>

<View
	as="div"
	bind:ref
	data-slot="sidebar-group-content"
	data-sidebar="group-content"
	width="100%"
	style={`font-size: 0.875rem; line-height: 1.25rem; ${style}`}
	{...restProps}
>
	{@render children?.()}
</View>
