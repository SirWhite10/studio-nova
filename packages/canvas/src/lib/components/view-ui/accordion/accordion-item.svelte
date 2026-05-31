<script lang="ts">
	import { Accordion as AccordionPrimitive } from "bits-ui";
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let { ref = $bindable(null), class: className = "", ...restProps }: AccordionPrimitive.ItemProps = $props();
</script>

<AccordionPrimitive.Item bind:ref {...restProps}>
	{#snippet child({ props })}
		<View {...props} data-slot="accordion-item" class={className} borderBottom={`1px solid ${canvasTheme.colors.border}`} />
	{/snippet}
</AccordionPrimitive.Item>
