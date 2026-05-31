<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";

	let {
		ref = $bindable(null),
		class: className = "",
		style = "",
		children,
		...restProps
	}: TabsPrimitive.ContentProps & {
		class?: string;
		children?: () => unknown;
	} = $props();
</script>

<TabsPrimitive.Content
	bind:ref
	data-slot="tabs-content"
	class={className}
	style={`flex: 1 1 0%; outline: none; ${style}`}
	{...restProps}
>
	{@render children?.()}
</TabsPrimitive.Content>

<style>
	:global([data-slot="tabs-content"]:focus-visible) {
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 50%, transparent);
	}
</style>
