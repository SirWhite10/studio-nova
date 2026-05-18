<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON } from "./constants.js";
	import { setSidebar } from "./context.svelte.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		open = $bindable(true),
		onOpenChange = () => {},
		children,
		style = "",
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		children?: () => any;
	} = $props();

	const sidebar = setSidebar({
		open: () => open,
		setOpen: (value: boolean) => {
			open = value;
			onOpenChange(value);
		},
	});
</script>

<svelte:window onkeydown={sidebar.handleShortcutKeydown} />

<View
	bind:ref
	data-slot="sidebar-wrapper"
	display="flex"
	height="100dvh"
	minHeight="100dvh"
	width="100%"
	background={canvasTheme.colors.background}
	color={canvasTheme.colors.foreground}
	style={`--sidebar-width: ${SIDEBAR_WIDTH}; --sidebar-width-icon: ${SIDEBAR_WIDTH_ICON}; --header-height: 3rem; font-family: ${canvasTheme.fonts.sans}; overflow: hidden; ${style}`}
	{...restProps}
>
	{@render children?.()}
</View>
