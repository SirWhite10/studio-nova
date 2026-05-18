<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";

	let {
		ref = $bindable(null),
		value = $bindable(""),
		class: className = "",
		style = "",
		...restProps
	}: TabsPrimitive.RootProps & {
		class?: string;
	} = $props();

	const inlineStyle = $derived(
		[
			"display: flex",
			"gap: 0.5rem",
			"width: 100%",
			"flex-direction: column",
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
	class={className}
	style={inlineStyle}
	{...restProps}
/>
