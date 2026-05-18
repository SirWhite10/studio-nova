<script lang="ts">
	import { Label as LabelPrimitive } from "bits-ui";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let {
		ref = $bindable(null),
		class: className = "",
		style = "",
		...restProps
	}: LabelPrimitive.RootProps & {
		class?: string;
	} = $props();

	const inlineStyle = $derived(
		[
			"display: inline-flex",
			"align-items: center",
			"gap: 0.5rem",
			"user-select: none",
			`color: ${canvasTheme.colors.foreground}`,
			"font-size: 0.875rem",
			"line-height: 1",
			"font-weight: 500",
			style,
		]
			.filter(Boolean)
			.join("; "),
	);
</script>

<LabelPrimitive.Root
	bind:ref
	data-slot="label"
	class={className}
	style={inlineStyle}
	{...restProps}
/>
