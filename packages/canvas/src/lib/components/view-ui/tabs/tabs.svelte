<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";

	let {
		ref = $bindable(null),
		value = $bindable(""),
		class: className = "",
		style = "",
		orientation = "horizontal",
		...restProps
	}: TabsPrimitive.RootProps & {
		class?: string;
	} = $props();

	const inlineStyle = $derived(
		[
			"display: flex",
			"gap: 0.5rem",
			"width: 100%",
			`flex-direction: ${orientation === "vertical" ? "row" : "column"}`,
			style,
		]
			.filter(Boolean)
			.join("; "),
	);
</script>

<TabsPrimitive.Root
	bind:ref
	bind:value
	data-slot="tabs"
	data-orientation={orientation}
	class={className}
	style={inlineStyle}
	{orientation}
	{...restProps}
/>
