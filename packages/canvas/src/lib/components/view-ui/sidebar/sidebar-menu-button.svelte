<script lang="ts">
	import { mergeProps } from "bits-ui";
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import { useSidebar } from "./context.svelte.js";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";

	type ButtonLikeProps = (HTMLButtonAttributes | HTMLAnchorAttributes) & {
		child?: Snippet<[{ props: Record<string, unknown> }]>;
		children?: () => any;
		variant?: "default" | "outline";
		size?: "default" | "sm" | "lg";
		isActive?: boolean;
		tooltipContent?: Snippet | string;
	};

	let {
		ref = $bindable(null),
		children,
		child,
		variant = "default",
		size = "default",
		isActive = false,
		tooltipContent: _tooltipContent = undefined,
		style = "",
		...restProps
	}: ButtonLikeProps = $props();

	const sidebar = useSidebar();

	const inlineStyle = $derived.by(() => {
		const collapsed = sidebar.isCollapsedToIcon;
		const height = size === "lg" ? "3rem" : size === "sm" ? "1.75rem" : "2rem";
		const padding = collapsed && size === "lg" ? "0" : "0.5rem";
		return [
			"display: flex",
			"align-items: center",
			`justify-content: ${collapsed ? "center" : "flex-start"}`,
			"gap: 0.5rem",
			"width: 100%",
			`height: ${collapsed ? "2rem" : height}`,
			`padding: ${padding}`,
			"border-radius: 0.375rem",
			"box-sizing: border-box",
			"overflow: hidden",
			"font-size: 0.875rem",
			"line-height: 1.25rem",
			`font-weight: ${isActive ? "500" : "400"}`,
			"outline: none",
			"text-decoration: none",
			"cursor: pointer",
			"transition: width 200ms ease-linear, height 200ms ease-linear, padding 200ms ease-linear, background-color 150ms ease, color 150ms ease",
			style,
		].join("; ");
	});

	const buttonProps = $derived({
		...restProps,
		"data-slot": "sidebar-menu-button",
		"data-sidebar": "menu-button",
		"data-size": size,
		"data-active": isActive,
		style: inlineStyle,
	});

	const states = $derived({
		hover: {
			background: canvasTheme.colors.sidebarAccent,
			color: canvasTheme.colors.foreground,
		},
		active: {
			background: canvasTheme.colors.sidebarAccent,
			color: canvasTheme.colors.foreground,
		},
	});

	const background = $derived(
		isActive || variant === "outline" ? canvasTheme.colors.sidebarAccent : "transparent",
	);
	const border = $derived(
		variant === "outline"
			? `1px solid color-mix(in srgb, ${canvasTheme.colors.foreground} 10%, transparent)`
			: "1px solid transparent",
	);
</script>

{#snippet ButtonNode(props)}
	{@const mergedProps = mergeProps(buttonProps, props)}
	{#if child}
		{@render child({ props: mergedProps })}
	{:else}
		<View
			as="button"
			bind:ref
			background={background}
			color={canvasTheme.colors.sidebarForeground}
			border={border}
			states={states}
			{...mergedProps}
		>
			{@render children?.()}
		</View>
	{/if}
{/snippet}

{@render ButtonNode({})}
