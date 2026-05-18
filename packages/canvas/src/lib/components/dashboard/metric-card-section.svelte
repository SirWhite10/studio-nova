<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { Text } from "$lib/base/text/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import { Badge } from "$lib/components/view-ui/badge/index.js";
	import * as Card from "$lib/components/view-ui/card/index.js";

	let viewportWidth = $state(1280);

	const metrics = [
		{
			title: "Total Revenue",
			value: "$1,250.00",
			change: "+12.5%",
			trend: "up",
			summary: "Trending up this month",
			context: "Visitors for the last 6 months",
		},
		{
			title: "New Customers",
			value: "1,234",
			change: "-20%",
			trend: "down",
			summary: "Down 20% this period",
			context: "Acquisition needs attention",
		},
		{
			title: "Active Accounts",
			value: "45,678",
			change: "+12.5%",
			trend: "up",
			summary: "Strong user retention",
			context: "Engagement exceed targets",
		},
		{
			title: "Growth Rate",
			value: "4.5%",
			change: "+4.5%",
			trend: "up",
			summary: "Steady performance increase",
			context: "Meets growth projections",
		},
	];

	const gridColumns = $derived.by(() => {
		if (viewportWidth >= 1536) return "repeat(4, minmax(0, 1fr))";
		if (viewportWidth >= 768) return "repeat(2, minmax(0, 1fr))";
		return "minmax(0, 1fr)";
	});

	const horizontalPadding = $derived(viewportWidth >= 1024 ? 6 : 4);
</script>

<svelte:window bind:innerWidth={viewportWidth} />

<View
	display="grid"
	gridTemplateColumns={gridColumns}
	gap={4}
	paddingLeft={horizontalPadding}
	paddingRight={horizontalPadding}
>
	{#each metrics as metric (metric.title)}
		<Card.Root style={`background: linear-gradient(to top, color-mix(in srgb, ${canvasTheme.colors.primary} 3%, ${canvasTheme.colors.card}), ${canvasTheme.colors.card}); box-shadow: ${canvasTheme.shadows.xs};`}>
			<Card.Header>
				<Card.Description style={`color: ${canvasTheme.colors.mutedForeground};`}>
					{metric.title}
				</Card.Description>
				<Card.Title style="font-size: 1.5rem; line-height: 2rem; font-weight: 600; font-variant-numeric: tabular-nums;">
					{metric.value}
				</Card.Title>
				<Card.Action>
					<Badge variant="outline">
						<span aria-hidden="true">{metric.trend === "down" ? "↘" : "↗"}</span>
						{metric.change}
					</Badge>
				</Card.Action>
			</Card.Header>
			<Card.Footer style="flex-direction: column; align-items: flex-start; gap: 0.375rem; font-size: 0.875rem;">
				<View display="flex" alignItems="center" gap={2}>
					<Text size="sm" weight="medium">{metric.summary}</Text>
					<Text size="sm" weight="medium" aria-hidden="true">
						{metric.trend === "down" ? "↘" : "↗"}
					</Text>
				</View>
				<Text size="sm" color={canvasTheme.colors.mutedForeground}>{metric.context}</Text>
			</Card.Footer>
		</Card.Root>
	{/each}
</View>
