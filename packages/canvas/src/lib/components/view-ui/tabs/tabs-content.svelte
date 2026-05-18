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
	style={style}
	{...restProps}
>
	{@render children?.()}
</TabsPrimitive.Content>
