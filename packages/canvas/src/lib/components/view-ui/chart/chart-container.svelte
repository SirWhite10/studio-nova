<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import { setChartContext, type ChartConfig } from "./chart-utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		id = "",
		class: className = "",
		style = "",
		children,
		config,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		config: ChartConfig;
		children?: () => unknown;
		class?: string;
	} = $props();

	const generatedId = `chart-${Math.random().toString(36).slice(2)}`;
	const chartId = $derived(id || generatedId);

	setChartContext({
		get config() {
			return config;
		},
	});

	const configVariables = $derived.by(() =>
		Object.entries(config)
			.flatMap(([key, value]) => {
				if (value.color) return [`--color-${key}: ${value.color};`];
				if (value.theme) return [`--color-${key}: ${value.theme.light};`];
				return [];
			})
			.join(" "),
	);

	const inlineStyle = $derived(
		[
			"overflow: visible",
			`font-family: ${canvasTheme.fonts.sans}`,
			"font-size: 0.75rem",
			"line-height: 1rem",
			configVariables,
			style,
		]
			.filter(Boolean)
			.join("; "),
	);
</script>

<View
	bind:ref
	as="div"
	id={chartId}
	class={className}
	data-slot="chart"
	data-chart={chartId}
	display="flex"
	justifyContent="center"
	alignItems="stretch"
	width="100%"
	overflow="visible"
	style={inlineStyle}
	{...restProps}
>
	{@render children?.()}
</View>
