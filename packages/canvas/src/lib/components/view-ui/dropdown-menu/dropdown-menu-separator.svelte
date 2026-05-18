<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let {
		ref = $bindable(null),
		style = "",
		...restProps
	}: DropdownMenuPrimitive.SeparatorProps = $props();
</script>

<DropdownMenuPrimitive.Separator
	bind:ref
	data-slot="dropdown-menu-separator"
	style={`display: block; height: 1px; margin: 0.25rem 0; background: color-mix(in srgb, ${canvasTheme.colors.foreground} 10%, transparent); ${style}`}
	{...restProps}
/>
