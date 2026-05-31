<script lang="ts">
	import { Accordion as AccordionPrimitive } from "bits-ui";
	import { View } from "$lib/base/view/index.js";

	let {
		ref = $bindable(null),
		class: className = "",
		children,
		...restProps
	}: AccordionPrimitive.ContentProps & { children?: () => any } = $props();
</script>

<AccordionPrimitive.Content bind:ref {...restProps}>
	{#snippet child({ props })}
		<View {...props} data-slot="accordion-content" class={className} overflow="hidden" fontSize="0.875rem" style="animation: accordion-down 150ms ease-out;">
			<View paddingBottom="1rem">
				{@render children?.()}
			</View>
		</View>
	{/snippet}
</AccordionPrimitive.Content>

<style>
	@keyframes accordion-down {
		from { opacity: 0; transform: translateY(-0.25rem); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
