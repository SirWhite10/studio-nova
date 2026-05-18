<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import { Select as SelectPrimitive } from "bits-ui";
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let {
		ref = $bindable(null),
		value,
		label,
		children: childrenProp,
		style = "",
		...restProps
	}: SelectPrimitive.ItemProps & {
		children?: any;
	} = $props();
</script>

<SelectPrimitive.Item bind:ref {value} data-slot="select-item" {...restProps}>
	{#snippet children({ selected, highlighted })}
		<View
			display="flex"
			alignItems="center"
			gap={2}
			paddingTop="0.375rem"
			paddingBottom="0.375rem"
			paddingLeft="0.5rem"
			paddingRight="2rem"
			borderRadius="0.375rem"
			background={highlighted ? canvasTheme.colors.muted : "transparent"}
			color={canvasTheme.colors.foreground}
			style={`position: relative; width: 100%; min-height: 2rem; font-size: 0.875rem; cursor: default; ${style}`}
		>
			<View
				display="flex"
				alignItems="center"
				justifyContent="center"
				style="position: absolute; right: 0.5rem; width: 0.875rem; height: 0.875rem;"
			>
				{#if selected}
					<CheckIcon size={14} />
				{/if}
			</View>
			{#if childrenProp}
				{@render childrenProp({ selected, highlighted })}
			{:else}
				{label || value}
			{/if}
		</View>
	{/snippet}
</SelectPrimitive.Item>
