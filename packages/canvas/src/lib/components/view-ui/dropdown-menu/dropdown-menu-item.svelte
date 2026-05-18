<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let {
		ref = $bindable(null),
		variant = "default",
		inset = false,
		style = "",
		...restProps
	}: DropdownMenuPrimitive.ItemProps & {
		variant?: "default" | "destructive";
		inset?: boolean;
	} = $props();
</script>

<DropdownMenuPrimitive.Item
	bind:ref
	data-slot="dropdown-menu-item"
	data-variant={variant}
	data-inset={inset}
	style={`display: flex; width: 100%; align-items: center; gap: 0.5rem; min-height: 2rem; padding: 0.375rem 0.5rem; padding-left: ${inset ? "2rem" : "0.5rem"}; border-radius: 0.5rem; font-size: 0.875rem; line-height: 1.25rem; color: ${variant === "destructive" ? "#b42318" : canvasTheme.colors.foreground}; cursor: default; user-select: none; outline: none; ${style}`}
	{...restProps}
/>
