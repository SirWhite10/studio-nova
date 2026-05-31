<script lang="ts">
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import { Accordion as AccordionPrimitive } from "bits-ui";
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let {
		ref = $bindable(null),
		class: className = "",
		level = 3,
		children,
		...restProps
	}: AccordionPrimitive.TriggerProps & { level?: AccordionPrimitive.HeaderProps["level"]; children?: () => any } = $props();

	const states = $derived({
		hover: { textDecoration: "underline" },
		focus: {
			borderColor: canvasTheme.colors.ring,
			boxShadow: `0 0 0 3px color-mix(in srgb, ${canvasTheme.colors.ring} 50%, transparent)`,
		},
		disabled: { opacity: 0.5, pointerEvents: "none" },
	});
</script>

<AccordionPrimitive.Header {level} class="flex">
	<AccordionPrimitive.Trigger bind:ref {...restProps}>
		{#snippet child({ props })}
			<View
				as="button"
				{...props}
				data-slot="accordion-trigger"
				class={className}
				type="button"
				display="flex"
				alignItems="center"
				justifyContent="space-between"
				width="100%"
				padding="1rem 0"
				fontSize="0.875rem"
				fontWeight="500"
				textAlign="left"
				border="1px solid transparent"
				borderRadius="0.375rem"
				background="transparent"
				color="inherit"
				states={states}
				style="outline: none; transition: color 150ms ease, box-shadow 150ms ease;"
			>
				{@render children?.()}
				<ChevronDownIcon data-slot="accordion-trigger-icon" size={16} />
			</View>
		{/snippet}
	</AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>

<style>
	:global([data-slot="accordion-trigger"][aria-expanded="true"] [data-slot="accordion-trigger-icon"]) {
		transform: rotate(180deg);
	}
	:global([data-slot="accordion-trigger-icon"]) {
		transition: transform 150ms ease;
		flex-shrink: 0;
	}
</style>
