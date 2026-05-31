<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import DropdownMenuPortal from "./dropdown-menu-portal.svelte";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		portalProps,
		style = "",
		sideOffset = 4,
		align = "start",
		children,
		...restProps
	}: DropdownMenuPrimitive.ContentProps & {
		portalProps?: ComponentProps<typeof DropdownMenuPortal>;
		children?: () => any;
	} = $props();
</script>

<DropdownMenuPortal {...portalProps}>
	<DropdownMenuPrimitive.Content
		bind:ref
		data-slot="dropdown-menu-content"
		{sideOffset}
		{align}
		style={`z-index: 60; min-width: max(8rem, var(--bits-dropdown-menu-anchor-width, 8rem)); border-radius: ${canvasTheme.radius.lg}; border: 1px solid ${canvasTheme.colors.border}; background: color-mix(in srgb, white 96%, ${canvasTheme.colors.background}); color: ${canvasTheme.colors.foreground}; box-shadow: 0 18px 40px rgb(15 23 42 / 0.16); padding: 0.25rem; outline: none; animation: view-ui-menu-in 150ms ease-out; ${style}`}
		{...restProps}
	>
		{@render children?.()}
	</DropdownMenuPrimitive.Content>
</DropdownMenuPortal>

<style>
	@keyframes view-ui-menu-in {
		from { opacity: 0; transform: translateY(-0.25rem) scale(0.98); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}
</style>
