<script lang="ts">
	import { Dialog } from "bits-ui";
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import { SIDEBAR_WIDTH_MOBILE } from "./constants.js";
	import { useSidebar } from "./context.svelte.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		side = "left",
		variant = "sidebar",
		collapsible = "offcanvas",
		children,
		style = "",
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		side?: "left" | "right";
		variant?: "sidebar" | "floating" | "inset";
		collapsible?: "offcanvas" | "icon" | "none";
		children?: () => any;
	} = $props();

	const sidebar = useSidebar();

	$effect(() => {
		sidebar.configureRoot({ side, variant, collapsible });
	});

	const desktopWidth = $derived.by(() => {
		if (collapsible === "none") return "var(--sidebar-width)";
		if (sidebar.state === "collapsed" && collapsible === "offcanvas") return "0px";
		if (sidebar.state === "collapsed" && collapsible === "icon") {
			return variant === "floating"
				? "calc(var(--sidebar-width-icon) + 1rem)"
				: "var(--sidebar-width-icon)";
		}
		return "var(--sidebar-width)";
	});

	const borderStyle = $derived.by(() =>
		variant === "floating"
			? `1px solid color-mix(in srgb, ${canvasTheme.colors.foreground} 10%, transparent)`
			: side === "left"
				? `0 1px 0 0 color-mix(in srgb, ${canvasTheme.colors.foreground} 10%, transparent) inset`
				: `1px 0 0 0 color-mix(in srgb, ${canvasTheme.colors.foreground} 10%, transparent) inset`,
	);

	const insetPadding = $derived(variant === "floating" ? "0.5rem" : "0");
</script>

{#if collapsible === "none"}
	<View
		bind:ref
		data-slot="sidebar"
		display="flex"
		flexDirection="column"
		width="var(--sidebar-width)"
		height="100dvh"
		background={canvasTheme.colors.sidebar}
		color={canvasTheme.colors.sidebarForeground}
		style={style}
		{...restProps}
	>
		{@render children?.()}
	</View>
{:else if sidebar.isMobile}
	<Dialog.Root bind:open={() => sidebar.openMobile, (value) => sidebar.setOpenMobile(value)}>
		<Dialog.Portal>
			<Dialog.Overlay
				style="position: fixed; inset: 0; z-index: 39; background: rgb(15 23 42 / 0.28);"
			/>
			<Dialog.Content
				bind:ref
				data-slot="sidebar"
				data-mobile="true"
				style={`position: fixed; inset-block: 0; ${side === "left" ? "left: 0;" : "right: 0;"} z-index: 40; display: flex; width: var(--sidebar-width-mobile, ${SIDEBAR_WIDTH_MOBILE}); max-width: calc(100vw - 1rem); padding: 0; border: none; outline: none; background: transparent; ${style}`}
				{...restProps}
			>
				<View
					display="flex"
					flexDirection="column"
					width="100%"
					height="100%"
					background={canvasTheme.colors.sidebar}
					color={canvasTheme.colors.sidebarForeground}
					borderRadius={variant === "floating" ? canvasTheme.radius.lg : undefined}
					border={
						variant === "floating"
							? `1px solid color-mix(in srgb, ${canvasTheme.colors.foreground} 10%, transparent)`
							: undefined
					}
					shadow="sm"
				>
					{@render children?.()}
				</View>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
{:else}
	<View
		bind:ref
		data-slot="sidebar"
		data-state={sidebar.state}
		data-collapsible={sidebar.state === "collapsed" ? collapsible : ""}
		data-variant={variant}
		data-side={side}
		display="flex"
		width={desktopWidth}
		minHeight="100dvh"
		style={`transition: width 180ms ease; flex-shrink: 0; overflow: visible; align-self: flex-start; ${style}`}
		{...restProps}
	>
		<View
			display="flex"
			flexDirection="column"
			width={desktopWidth}
			height="100dvh"
			padding={insetPadding}
			style={`box-sizing: border-box; overflow: hidden; transition: width 180ms ease; position: sticky; top: 0;`}
		>
			<View
				data-slot="sidebar-inner"
				display="flex"
				flexDirection="column"
				height="100%"
				background={canvasTheme.colors.sidebar}
				color={canvasTheme.colors.sidebarForeground}
				border={
					variant === "floating"
						? `1px solid color-mix(in srgb, ${canvasTheme.colors.foreground} 10%, transparent)`
						: undefined
				}
				borderRadius={variant === "floating" ? canvasTheme.radius.lg : undefined}
				shadow={variant === "floating" ? "sm" : "none"}
				style={`box-shadow: ${variant === "sidebar" ? borderStyle : ""}; overflow: hidden;`}
			>
				{@render children?.()}
			</View>
		</View>
	</View>
{/if}
