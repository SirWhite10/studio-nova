<script lang="ts">
	import { ToggleGroup as ToggleGroupPrimitive } from "bits-ui";
	import { View } from "$lib/base/view/index.js";
	import { setToggleGroupCtx } from "./context.svelte.js";

	let {
		ref = $bindable(null),
		value = $bindable(),
		size = "default",
		spacing = 0,
		orientation = "horizontal",
		variant = "default",
		children,
		style = "",
		...restProps
	}: ToggleGroupPrimitive.RootProps & {
		size?: "default" | "sm" | "lg";
		spacing?: number;
		orientation?: "horizontal" | "vertical";
		children?: () => any;
	} = $props();

	setToggleGroupCtx({
		get variant() {
			return variant;
		},
		get size() {
			return size;
		},
		get spacing() {
			return spacing;
		},
		get orientation() {
			return orientation;
		},
	});
</script>

<ToggleGroupPrimitive.Root bind:value={value as never} bind:ref {orientation} {...restProps}>
	{#snippet child({ props })}
		<View
			{...props}
			data-slot="toggle-group"
			data-variant={variant}
			data-size={size}
			data-spacing={spacing}
			display="flex"
			flexDirection={orientation === "vertical" ? "column" : "row"}
			alignItems="stretch"
			gap={spacing}
			borderRadius="0.375rem"
			shadow={spacing === 0 && variant === "outline" ? "sm" : "none"}
			style={`width: fit-content; overflow: hidden; ${style}`}
		>
			{@render children?.()}
		</View>
	{/snippet}
</ToggleGroupPrimitive.Root>
