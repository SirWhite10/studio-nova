<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import CheckIcon from "@tabler/icons-svelte/icons/check";
	import MinusIcon from "@tabler/icons-svelte/icons/minus";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		indeterminate = $bindable(false),
		style = "",
		children,
		...restProps
	}: DropdownMenuPrimitive.CheckboxItemProps & {
		children?: () => unknown;
	} = $props();
</script>

<DropdownMenuPrimitive.CheckboxItem
	bind:ref
	bind:checked
	bind:indeterminate
	data-slot="dropdown-menu-checkbox-item"
	style={`position: relative; display: flex; width: 100%; align-items: center; gap: 0.5rem; min-height: 2rem; padding: 0.375rem 2rem 0.375rem 0.5rem; border-radius: 0.5rem; font-size: 0.875rem; line-height: 1.25rem; color: ${canvasTheme.colors.foreground}; cursor: default; user-select: none; outline: none; ${style}`}
	{...restProps}
>
	{#snippet children({ checked, indeterminate })}
		<span style="position: absolute; right: 0.5rem; display: inline-flex; align-items: center; justify-content: center;">
			{#if indeterminate}
				<MinusIcon size={16} />
			{:else if checked}
				<CheckIcon size={16} />
			{/if}
		</span>
		{@render children?.()}
	{/snippet}
</DropdownMenuPrimitive.CheckboxItem>

<style>
	:global([data-slot="dropdown-menu-checkbox-item"]:focus),
	:global([data-slot="dropdown-menu-checkbox-item"][data-highlighted]) {
		background: var(--muted) !important;
	}
	:global([data-slot="dropdown-menu-checkbox-item"]:focus-visible) {
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 50%, transparent);
	}
	:global([data-slot="dropdown-menu-checkbox-item"][data-disabled]) {
		opacity: 0.5;
		pointer-events: none;
	}
</style>
