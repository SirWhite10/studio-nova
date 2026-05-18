<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import { useSidebar } from "./context.svelte.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		children,
		style = "",
		...restProps
	}: HTMLAttributes<HTMLElement> & {
		children?: () => any;
	} = $props();

	const sidebar = useSidebar();
	const isInset = $derived(sidebar.rootConfig.variant === "inset" && !sidebar.isMobile);
</script>

<View
	as="main"
	bind:ref
	data-slot="sidebar-inset"
	display="flex"
	flexDirection="column"
	flex="1"
	width="100%"
	minWidth="0"
	minHeight="0"
	background={canvasTheme.colors.background}
	borderRadius={isInset ? canvasTheme.radius.xl : undefined}
	shadow={isInset ? "sm" : "none"}
	marginTop={isInset ? "0.5rem" : undefined}
	marginRight={isInset ? "0.5rem" : undefined}
	marginBottom={isInset ? "0.5rem" : undefined}
	marginLeft={isInset ? (sidebar.state === "collapsed" ? "0.5rem" : "0") : undefined}
	style={`position: relative; min-height: 0; height: 100dvh; overflow: hidden; transition: margin 180ms ease; ${style}`}
	{...restProps}
>
	{@render children?.()}
</View>
