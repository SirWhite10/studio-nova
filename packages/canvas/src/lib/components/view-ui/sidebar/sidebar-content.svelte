<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { useSidebar } from "./context.svelte.js";
	import type { HTMLAttributes } from "svelte/elements";

	let { ref = $bindable(null), children, style = "", ...restProps }: HTMLAttributes<HTMLElement> & { children?: () => any } = $props();

	const sidebar = useSidebar();
</script>

<View
	as="div"
	bind:ref
	data-slot="sidebar-content"
	data-sidebar="content"
	display="flex"
	flexDirection="column"
	flex="1"
	minHeight="0"
	gap={2}
	overflow={sidebar.isCollapsedToIcon ? "hidden" : "auto"}
	style={`scrollbar-width: none; -ms-overflow-style: none; ${style}`}
	{...restProps}
>
	{@render children?.()}
</View>
