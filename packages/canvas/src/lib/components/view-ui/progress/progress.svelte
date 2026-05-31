<script lang="ts">
	import { Progress as ProgressPrimitive } from "bits-ui";
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let {
		ref = $bindable(null),
		value = 0,
		max = 100,
		class: className = "",
		...restProps
	}: ProgressPrimitive.RootProps = $props();

	const percent = $derived(Math.max(0, Math.min(100, (100 * (value ?? 0)) / (max ?? 100))));
</script>

<ProgressPrimitive.Root bind:ref {value} {max} {...restProps}>
	{#snippet child({ props })}
		<View
			{...props}
			data-slot="progress"
			class={className}
			width="100%"
			height="0.375rem"
			display="flex"
			alignItems="center"
			overflow="hidden"
			borderRadius="9999px"
			background={`color-mix(in srgb, ${canvasTheme.colors.primary} 20%, transparent)`}
			style="position: relative;"
		>
			<View
				data-slot="progress-indicator"
				height="100%"
				width="100%"
				flex="1"
				background={canvasTheme.colors.primary}
				style={`transition: transform 150ms ease; transform: translateX(-${100 - percent}%);`}
			/>
		</View>
	{/snippet}
</ProgressPrimitive.Root>
