<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import MinusIcon from "@lucide/svelte/icons/minus";
	import { Checkbox as CheckboxPrimitive } from "bits-ui";
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		indeterminate = $bindable(false),
		class: className = "",
		disabled = false,
		...restProps
	}: CheckboxPrimitive.RootProps = $props();

	const states = $derived({
		focus: {
			borderColor: canvasTheme.colors.ring,
			boxShadow: `0 0 0 3px color-mix(in srgb, ${canvasTheme.colors.ring} 50%, transparent)`,
		},
		disabled: { opacity: 0.5, pointerEvents: "none" },
	});
</script>

<CheckboxPrimitive.Root bind:ref bind:checked bind:indeterminate {disabled} {...restProps}>
	{#snippet child({ props })}
		<View
			as="button"
			{...props}
			data-slot="checkbox"
			class={className}
			type="button"
			width="1rem"
			height="1rem"
			display="inline-flex"
			alignItems="center"
			justifyContent="center"
			flexShrink="0"
			border={`1px solid ${checked || indeterminate ? canvasTheme.colors.primary : canvasTheme.colors.border}`}
			borderRadius="4px"
			background={checked || indeterminate ? canvasTheme.colors.primary : "transparent"}
			color={checked || indeterminate ? "var(--primary-foreground)" : "inherit"}
			shadow="xs"
			opacity={disabled ? 0.5 : undefined}
			pointerEvents={disabled ? "none" : undefined}
			states={states}
			style="position: relative; padding: 0; outline: none; transition: color 150ms ease, box-shadow 150ms ease, border-color 150ms ease, background 150ms ease;"
		>
			{#if checked}
				<CheckIcon size={14} />
			{:else if indeterminate}
				<MinusIcon size={14} />
			{/if}
		</View>
	{/snippet}
</CheckboxPrimitive.Root>
