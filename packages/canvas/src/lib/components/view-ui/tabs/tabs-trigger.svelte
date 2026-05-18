<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let {
		ref = $bindable(null),
		class: className = "",
		style = "",
		children,
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
>
	{@render children?.()}
</TabsPrimitive.Trigger>
