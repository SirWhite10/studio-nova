<script lang="ts">
	import {
		Tooltip,
		TooltipContent,
		TooltipProvider,
		TooltipTrigger,
	} from "$lib/components/ui/tooltip/index.js";
	import type { Snippet } from "svelte";
	import type { Tooltip as TooltipPrimitive } from "bits-ui";

	let {
		tooltip,
		side = "top",
		class: className,
		children,
		...restProps
	}: {
		tooltip: Snippet;
		side?: "top" | "bottom" | "left" | "right";
		class?: string;
		// typed as any to avoid SnippetReturn symbol conflict between Svelte versions
		children: any;
	} & TooltipPrimitive.RootProps = $props();
</script>

<TooltipProvider>
	<Tooltip delayDuration={60} {...restProps}>
		<TooltipTrigger>
			{@render children()}
		</TooltipTrigger>
		<TooltipContent {side} class={className}>
			{@render tooltip()}
		</TooltipContent>
	</Tooltip>
</TooltipProvider>
