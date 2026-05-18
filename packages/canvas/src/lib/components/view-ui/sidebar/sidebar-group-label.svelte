<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import { useSidebar } from "./context.svelte.js";
	import type { HTMLAttributes } from "svelte/elements";

	let { ref = $bindable(null), children, style = "", ...restProps }: HTMLAttributes<HTMLElement> & { children?: () => any } = $props();

	const sidebar = useSidebar();
</script>

<View
	as="div"
	bind:ref
	data-slot="sidebar-group-label"
	data-sidebar="group-label"
	display={sidebar.isCollapsedToIcon ? "none" : "flex"}
	alignItems="center"
	height="2rem"
	paddingLeft={2}
	paddingRight={2}
	borderRadius="0.375rem"
	color={canvasTheme.colors.sidebarMuted}
	style={`font-size: 0.75rem; line-height: 1rem; font-weight: 500; flex-shrink: 0; outline: none; ${style}`}
	{...restProps}
>
	{@render children?.()}
</View>
