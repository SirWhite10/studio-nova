<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let {
		ref = $bindable(null),
		class: className = "",
		style = "",
		children,
		disabled = false,
		...restProps
	}: TabsPrimitive.TriggerProps & {
		class?: string;
		children?: () => unknown;
	} = $props();

	const inlineStyle = $derived(
		[
			"display: inline-flex",
			"align-items: center",
			"justify-content: center",
			"gap: 0.375rem",
			"min-height: 2rem",
			"padding: 0.25rem 0.5rem",
			"white-space: nowrap",
			"border-radius: 0.5rem",
			"border: 1px solid transparent",
			`color: color-mix(in srgb, ${canvasTheme.colors.foreground} 60%, transparent)`,
			"font-size: 0.875rem",
			"font-weight: 500",
			"background: transparent",
			"cursor: pointer",
			style,
		]
			.filter(Boolean)
			.join("; "),
	);
</script>

<TabsPrimitive.Trigger
	bind:ref
	data-slot="tabs-trigger"
	class={className}
	style={inlineStyle}
	{...restProps}
 disabled={disabled}
>
	{@render children?.()}
</TabsPrimitive.Trigger>

<style>
	:global([data-slot="tabs-trigger"]) {
		position: relative;
		transition: background-color 150ms ease, color 150ms ease, box-shadow 150ms ease;
	}
	:global([data-slot="tabs-trigger"][data-state="active"]),
	:global([data-slot="tabs-trigger"][data-active="true"]) {
		background: var(--background) !important;
		color: var(--foreground) !important;
		box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
	}
	:global([data-slot="tabs-list"][data-variant="line"] [data-slot="tabs-trigger"][data-state="active"]) {
		background: transparent !important;
		box-shadow: none;
	}
	:global([data-slot="tabs-list"][data-variant="line"] [data-slot="tabs-trigger"][data-state="active"]::after) {
		content: "";
		position: absolute;
		left: 0.5rem;
		right: 0.5rem;
		bottom: -0.25rem;
		height: 2px;
		border-radius: 999px;
		background: var(--primary);
		animation: view-ui-tabs-line-in 150ms ease-out;
	}
	:global([data-slot="tabs-trigger"]:focus-visible) {
		border-color: var(--ring) !important;
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 50%, transparent) !important;
	}
	:global([data-slot="tabs-trigger"]:disabled),
	:global([data-slot="tabs-trigger"][data-disabled]) {
		opacity: 0.5;
		pointer-events: none;
	}
	:global([data-slot="tabs-trigger"] svg:not([data-size])) {
		width: 1rem;
		height: 1rem;
		pointer-events: none;
		flex-shrink: 0;
	}
	@keyframes view-ui-tabs-line-in {
		from { transform: scaleX(0.6); opacity: 0; }
		to { transform: scaleX(1); opacity: 1; }
	}
</style>
