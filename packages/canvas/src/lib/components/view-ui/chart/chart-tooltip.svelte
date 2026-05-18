<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { Text } from "$lib/base/text/index.js";
	import { getChartContext, Tooltip as TooltipPrimitive } from "layerchart";
	import { getPayloadConfigFromPayload, useChart, type TooltipPayload } from "./chart-utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	function defaultFormatter(value: unknown) {
		return `${value}`;
	}

	let {
		ref = $bindable(null),
		class: className = "",
		hideLabel = false,
		indicator = "dot",
		hideIndicator = false,
		labelKey = undefined,
		label = undefined,
		labelFormatter = defaultFormatter,
		formatter = undefined,
		nameKey = undefined,
		color = undefined,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		hideLabel?: boolean;
		label?: string;
		indicator?: "line" | "dot" | "dashed";
		nameKey?: string;
		labelKey?: string;
		hideIndicator?: boolean;
		labelFormatter?: ((value: unknown, payload: TooltipPayload[]) => string | number | Snippet) | null;
		formatter?: Snippet<
			[
				{
					value: unknown;
					name: string;
					item: TooltipPayload;
					index: number;
					payload: TooltipPayload[];
				},
			]
		>;
		class?: string;
	} = $props();

	const chart = useChart();
	const chartCtx = getChartContext();

	const visibleSeries = $derived(
		chartCtx.tooltip.series.filter((series: TooltipPayload) => series.value !== undefined),
	);

	const formattedLabel = $derived.by(() => {
		if (hideLabel || !visibleSeries.length) return null;

		const [item] = visibleSeries;
		const tooltipData = chartCtx.tooltip.data;
		const dataLabel = tooltipData != null ? chartCtx.x(tooltipData) : undefined;
		const key = labelKey ?? item?.label ?? item?.key ?? "value";
		const itemConfig = getPayloadConfigFromPayload(
			chart.config,
			item,
			key,
			tooltipData as Record<string, unknown> | null,
		);

		let value: unknown;
		if (!labelKey && typeof label === "string") {
			value = chart.config[label as keyof typeof chart.config]?.label ?? label;
		} else if (labelKey) {
			value = itemConfig?.label ?? dataLabel;
		} else {
			value = dataLabel;
		}

		if (value === undefined) return null;
		if (!labelFormatter) return value;
		return labelFormatter(value, visibleSeries);
	});

	const nestLabel = $derived(visibleSeries.length === 1 && indicator !== "dot");

	function indicatorStyle(indicatorColor: string | undefined) {
		if (!indicatorColor) return "";
		if (indicator === "line") {
			return [
				`background: ${indicatorColor}`,
				"width: 0.25rem",
				"height: 100%",
				"border-radius: 999px",
			].join("; ");
		}
		if (indicator === "dashed") {
			return [
				`border-left: 1.5px dashed ${indicatorColor}`,
				"background: transparent",
				"width: 0",
				"height: 1.25rem",
			].join("; ");
		}
		return [
			`background: ${indicatorColor}`,
			"width: 0.625rem",
			"height: 0.625rem",
			"border-radius: 2px",
		].join("; ");
	}
</script>

{#snippet TooltipLabel()}
	{#if formattedLabel}
		<Text size="sm" weight="medium" lineHeight="tight">
			{#if typeof formattedLabel === "function"}
				{@render formattedLabel()}
			{:else}
				{formattedLabel}
			{/if}
		</Text>
	{/if}
{/snippet}

<TooltipPrimitive.Root variant="none">
	<View
		bind:ref
		as="div"
		class={className}
		background={canvasTheme.colors.card}
		border={`1px solid color-mix(in srgb, ${canvasTheme.colors.foreground} 12%, transparent)`}
		borderRadius={canvasTheme.radius.lg}
		shadow={canvasTheme.shadows.sm}
		padding={2.5}
		style="min-width: 9rem;"
		{...restProps}
	>
		{#if !nestLabel}
			{@render TooltipLabel()}
		{/if}
		<View display="grid" gap={1.5} marginTop={nestLabel ? 0 : 1.5}>
			{#each visibleSeries as item, i (`${item.key}${i}`)}
				{@const key = `${nameKey || item.key || item.label || "value"}`}
				{@const itemConfig = getPayloadConfigFromPayload(
					chart.config,
					item,
					key,
					chartCtx.tooltip.data as Record<string, unknown> | null,
				)}
				{@const indicatorColor = color || item.config?.color || item.color}
				<View display="flex" alignItems={indicator === "dot" ? "center" : "stretch"} gap={2}>
					{#if formatter && item.value !== undefined && item.label}
						{@render formatter({
							value: item.value,
							name: item.label,
							item,
							index: i,
							payload: visibleSeries,
						})}
					{:else}
						{#if itemConfig?.icon}
							<itemConfig.icon />
						{:else if !hideIndicator}
							<View as="span" display="inline-flex" flexShrink={0} style={indicatorStyle(indicatorColor)} />
						{/if}
						<View
							display="flex"
							justifyContent="space-between"
							alignItems={nestLabel ? "flex-end" : "center"}
							width="100%"
							gap={3}
						>
							<View display="grid" gap={1}>
								{#if nestLabel}
									{@render TooltipLabel()}
								{/if}
								<Text size="sm" color={canvasTheme.colors.mutedForeground}>
									{itemConfig?.label || item.label}
								</Text>
							</View>
							{#if item.value !== undefined}
								<Text size="sm" weight="medium">
									{item.value.toLocaleString()}
								</Text>
							{/if}
						</View>
					{/if}
				</View>
			{/each}
		</View>
	</View>
</TooltipPrimitive.Root>
