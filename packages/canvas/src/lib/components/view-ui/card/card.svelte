<script lang="ts">
	import type { Snippet } from "svelte";
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let {
		ref = $bindable(null),
		children,
		class: className = "",
		style = "",
		"data-size": dataSize = "default",
		"data-variant": dataVariant = "default",
		"data-disabled": dataDisabled = "false",
		...restProps
	}: {
		ref?: HTMLElement | null;
		children?: Snippet;
		class?: string;
		style?: string;
		"data-size"?: string;
		"data-variant"?: string;
		"data-disabled"?: string;
		[key: string]: any;
	} = $props();

	const isSmall = $derived(dataSize === "sm");
	const isDisabled = $derived(dataDisabled === "true");
	const states = $derived({
		hover: dataVariant === "interactive" && !isDisabled ? { boxShadow: canvasTheme.shadows.sm } : {},
		disabled: { opacity: 0.6, pointerEvents: "none" },
	});
</script>

<View
	bind:ref
	data-slot="card"
	data-size={dataSize}
	data-variant={dataVariant}
	data-disabled={dataDisabled}
	class={className}
	display="flex"
	flexDirection="column"
	overflow="hidden"
	gap={isSmall ? "1rem" : "1.5rem"}
	paddingTop={isSmall ? "1rem" : "1.5rem"}
	paddingBottom={isSmall ? "1rem" : "1.5rem"}
	border={`1px solid ${canvasTheme.colors.border}`}
	borderRadius="0.75rem"
	background="var(--card, var(--background))"
	color="var(--card-foreground, inherit)"
	fontSize="0.875rem"
	shadow={dataVariant === "elevated" ? "sm" : dataVariant === "outline" ? "none" : "xs"}
	opacity={isDisabled ? 0.6 : undefined}
	pointerEvents={isDisabled ? "none" : undefined}
	states={states}
	style={`box-sizing: border-box; ${dataVariant === "interactive" && !isDisabled ? "cursor: pointer; transition: box-shadow 150ms ease;" : ""} ${style}`}
	{...restProps}
>
	{@render children?.()}
</View>
