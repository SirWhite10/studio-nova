<script lang="ts" module>
	export type BadgeVariant =
		| "default"
		| "secondary"
		| "destructive"
		| "outline"
		| "ghost"
		| "link";
</script>

<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { HTMLAnchorAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		href,
		variant = "default",
		children,
		style = "",
		...restProps
	}: HTMLAnchorAttributes & {
		variant?: BadgeVariant;
		children?: () => any;
	} = $props();

	const palette = $derived.by(() => {
		switch (variant) {
			case "secondary":
				return {
					background: canvasTheme.colors.muted,
					color: canvasTheme.colors.foreground,
					border: "1px solid transparent",
				};
			case "destructive":
				return {
					background: "color-mix(in srgb, #b42318 10%, white)",
					color: "#b42318",
					border: "1px solid color-mix(in srgb, #b42318 16%, transparent)",
				};
			case "outline":
				return {
					background: canvasTheme.colors.background,
					color: canvasTheme.colors.foreground,
					border: `1px solid color-mix(in srgb, ${canvasTheme.colors.foreground} 12%, transparent)`,
				};
			case "ghost":
				return {
					background: "transparent",
					color: canvasTheme.colors.foreground,
					border: "1px solid transparent",
				};
			case "link":
				return {
					background: "transparent",
					color: canvasTheme.colors.foreground,
					border: "1px solid transparent",
				};
			default:
				return {
					background: canvasTheme.colors.primary,
					color: "white",
					border: `1px solid ${canvasTheme.colors.primary}`,
				};
		}
	});
</script>

<View
	as={href ? "a" : "span"}
	bind:ref
	data-slot="badge"
	background={palette.background}
	color={palette.color}
	border={palette.border}
	borderRadius="999px"
	paddingTop="0.125rem"
	paddingBottom="0.125rem"
	paddingLeft="0.5rem"
	paddingRight="0.5rem"
	style={`display: inline-flex; width: fit-content; min-height: 1.25rem; align-items: center; justify-content: center; gap: 0.25rem; white-space: nowrap; font-size: 0.75rem; font-weight: 500; line-height: 1rem; text-decoration: ${variant === "link" ? "underline" : "none"}; text-underline-offset: 4px; ${style}`}
	{href}
	{...restProps}
>
	{@render children?.()}
</View>
