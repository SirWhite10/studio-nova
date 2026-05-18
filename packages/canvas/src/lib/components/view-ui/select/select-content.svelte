<script lang="ts">
	import { Select as SelectPrimitive } from "bits-ui";
	import SelectPortal from "./select-portal.svelte";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		sideOffset = 4,
		portalProps,
		children,
		style = "",
		preventScroll = true,
		...restProps
	}: SelectPrimitive.ContentProps & {
		portalProps?: ComponentProps<typeof SelectPortal>;
		children?: () => any;
	} = $props();
</script>

<SelectPortal {...portalProps}>
	<SelectPrimitive.Content
		bind:ref
		{sideOffset}
		{preventScroll}
		data-slot="select-content"
		style={`z-index: 60; min-width: max(9rem, var(--bits-select-anchor-width, 9rem)); border-radius: ${canvasTheme.radius.lg}; border: 1px solid color-mix(in srgb, ${canvasTheme.colors.foreground} 10%, transparent); background: color-mix(in srgb, white 96%, ${canvasTheme.colors.background}); color: ${canvasTheme.colors.foreground}; box-shadow: 0 18px 40px rgb(15 23 42 / 0.16); padding: 0.25rem; outline: none; ${style}`}
		{...restProps}
	>
		<SelectPrimitive.Viewport style="width: 100%; min-width: var(--bits-select-anchor-width, auto);">
			{@render children?.()}
		</SelectPrimitive.Viewport>
	</SelectPrimitive.Content>
</SelectPortal>
