<script lang="ts">
	import { mergeProps } from "bits-ui";
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import { useSidebar } from "./context.svelte.js";
	import type { HTMLButtonAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";

	let {
		ref = $bindable(null),
		children,
		child,
		showOnHover = false,
		style = "",
		...restProps
	}: HTMLButtonAttributes & {
		child?: Snippet<[{ props: Record<string, unknown> }]>;
		children?: () => any;
		showOnHover?: boolean;
	} = $props();

	const sidebar = useSidebar();
	const buttonProps = $derived({
		...restProps,
		"data-slot": "sidebar-menu-action",
		"data-sidebar": "menu-action",
		style: [
			"display: inline-flex",
			"align-items: center",
			"justify-content: center",
			"position: absolute",
			"top: 0.375rem",
			"right: 0.25rem",
			"width: 1.25rem",
			"aspect-ratio: 1 / 1",
			"border-radius: 0.375rem",
			"padding: 0",
			"outline: none",
			"cursor: pointer",
			`${sidebar.isCollapsedToIcon ? "display: none" : ""}`,
			`opacity: ${showOnHover ? 0.72 : 1}`,
			"transition: transform 150ms ease, opacity 150ms ease, background-color 150ms ease, color 150ms ease",
			style,
		].join("; "),
	});
</script>

{#snippet ActionButtonNode(props)}
	{@const mergedProps = mergeProps(buttonProps, props)}
	{#if child}
		{@render child({ props: mergedProps })}
	{:else if !sidebar.isCollapsedToIcon}
		<View
			as="button"
			bind:ref
			background="transparent"
			color={canvasTheme.colors.sidebarForeground}
			border="1px solid transparent"
			states={{
				hover: { background: canvasTheme.colors.sidebarAccent, color: canvasTheme.colors.foreground },
				focusVisible: { boxShadow: `0 0 0 2px ${canvasTheme.colors.ring}` },
			}}
			{...mergedProps}
		>
			{@render children?.()}
		</View>
	{/if}
{/snippet}

{@render ActionButtonNode({})}
