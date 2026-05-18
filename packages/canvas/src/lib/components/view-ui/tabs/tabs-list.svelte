<script lang="ts" module>
	export type TabsListVariant = "default" | "line";
</script>

<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let {
		ref = $bindable(null),
		variant = "default",
		class: className = "",
		style = "",
		...restProps
	}: TabsPrimitive.ListProps & {
		variant?: TabsListVariant;
		class?: string;
	} = $props();

	const inlineStyle = $derived(
		variant === "line"
			? [
					"display: inline-flex",
					"align-items: center",
					"gap: 0.25rem",
					"border-bottom: 1px solid color-mix(in srgb, black 10%, transparent)",
					"background: transparent",
					style,
				]
					.filter(Boolean)
					.join("; ")
			: [
					"display: inline-flex",
					"align-items: center",
					"gap: 0.25rem",
					`border-radius: ${canvasTheme.radius.lg}`,
					`background: ${canvasTheme.colors.muted}`,
					"padding: 0.25rem",
					style,
				]
					.filter(Boolean)
					.join("; "),
	);
</script>

<TabsPrimitive.List
	bind:ref
	data-slot="tabs-list"
	data-variant={variant}
	class={className}
	style={inlineStyle}
	{...restProps}
/>
