<script lang="ts">
	import { Switch as SwitchPrimitive } from "bits-ui";
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		class: className = "",
		size = "default",
		disabled = false,
		...restProps
	}: SwitchPrimitive.RootProps & { size?: "sm" | "default" } = $props();

	const width = $derived(size === "sm" ? "1.5rem" : "2rem");
	const height = $derived(size === "sm" ? "0.875rem" : "1.15rem");
	const thumb = $derived(size === "sm" ? "0.75rem" : "1rem");
	const translate = $derived(size === "sm" ? "calc(100% - 2px)" : "calc(100% - 2px)");
	const states = $derived({
		focus: {
			borderColor: canvasTheme.colors.ring,
			boxShadow: `0 0 0 3px color-mix(in srgb, ${canvasTheme.colors.ring} 50%, transparent)`,
		},
		disabled: { opacity: 0.5, pointerEvents: "none" },
	});
</script>

<SwitchPrimitive.Root bind:ref bind:checked {disabled} {...restProps}>
	{#snippet child({ props })}
		<View
			as="button"
			{...props}
			data-slot="switch"
			class={className}
			type="button"
			width={width}
			height={height}
			display="inline-flex"
			alignItems="center"
			flexShrink="0"
			border="1px solid transparent"
			borderRadius="9999px"
			background={checked ? canvasTheme.colors.primary : canvasTheme.colors.input ?? canvasTheme.colors.border}
			shadow="xs"
			opacity={disabled ? 0.5 : undefined}
			pointerEvents={disabled ? "none" : undefined}
			states={states}
			style="position: relative; padding: 0; outline: none; transition: color 150ms ease, box-shadow 150ms ease, border-color 150ms ease, background 150ms ease;"
		>
			<View
				data-slot="switch-thumb"
				width={thumb}
				height={thumb}
				borderRadius="9999px"
				background={checked ? "var(--primary-foreground)" : canvasTheme.colors.background}
				style={`display: block; pointer-events: none; transition: transform 150ms ease; transform: translateX(${checked ? translate : "0"});`}
			/>
		</View>
	{/snippet}
</SwitchPrimitive.Root>
