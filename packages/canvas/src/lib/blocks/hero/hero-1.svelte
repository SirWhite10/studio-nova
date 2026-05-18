<script lang="ts">
	import { SvelteMap } from "svelte/reactivity";
	import CanvasRenderNodes from "$lib/base/canvas/render-nodes.svelte";
	import type {
		CanvasComponentCatalog,
		CanvasNode,
		CanvasProviderActions,
		CanvasProviderData,
		ComponentRegistryValue,
		RenderComponentFn,
	} from "$lib/base/canvas/types.js";
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		nodePath = [],
		nodeSlots = {},
		componentCatalog = {},
		customComponents = new SvelteMap<string, ComponentRegistryValue>(),
		providerData = {},
		providerActions = {},
		renderComponent = undefined,
	}: {
		class?: string;
		nodePath?: string[];
		nodeSlots?: Record<string, CanvasNode[]>;
		componentCatalog?: CanvasComponentCatalog;
		customComponents?: SvelteMap<string, ComponentRegistryValue>;
		providerData?: CanvasProviderData;
		providerActions?: CanvasProviderActions;
		renderComponent?: RenderComponentFn;
	} = $props();

	function hasSlot(slotName: string) {
		return (nodeSlots[slotName]?.length ?? 0) > 0;
	}

	let hasMedia = $derived(hasSlot("media") || hasSlot("mediaOverlay"));
</script>

<section
	class={cn(
		"relative isolate w-full overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-b from-background via-background to-muted/30 px-6 py-12 shadow-sm sm:px-8 md:px-10 md:py-16 lg:px-12 lg:py-20",
		className,
	)}
>
	<div
		class="pointer-events-none absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_top,rgba(99,102,241,0.14),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.12),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.08),transparent_34%)]"
	></div>
	<div class="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>

	<div
		class={cn(
			"relative grid items-center gap-10 lg:gap-14",
			hasMedia
				? "lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]"
				: "mx-auto max-w-4xl",
		)}
	>
		<div
			class={cn(
				"relative flex flex-col gap-8",
				hasMedia
					? "items-center text-center lg:items-start lg:text-left"
					: "mx-auto items-center text-center",
			)}
		>
			<div class="flex max-w-3xl flex-col gap-5">
				{#if hasSlot("eyebrow")}
					<CanvasRenderNodes
						nodes={nodeSlots.eyebrow}
						basePath={[...nodePath, "slot:eyebrow"]}
						{componentCatalog}
						{customComponents}
						{providerData}
						{providerActions}
						{renderComponent}
					/>
				{/if}

				{#if hasSlot("title")}
					<CanvasRenderNodes
						nodes={nodeSlots.title}
						basePath={[...nodePath, "slot:title"]}
						{componentCatalog}
						{customComponents}
						{providerData}
						{providerActions}
						{renderComponent}
					/>
				{/if}

				{#if hasSlot("description")}
					<CanvasRenderNodes
						nodes={nodeSlots.description}
						basePath={[...nodePath, "slot:description"]}
						{componentCatalog}
						{customComponents}
						{providerData}
						{providerActions}
						{renderComponent}
					/>
				{/if}
			</div>

			{#if hasSlot("actions")}
				<div
					class={cn(
						"flex flex-wrap items-center gap-4",
						hasMedia ? "justify-center lg:justify-start" : "justify-center",
					)}
				>
					<CanvasRenderNodes
						nodes={nodeSlots.actions}
						basePath={[...nodePath, "slot:actions"]}
						{componentCatalog}
						{customComponents}
						{providerData}
						{providerActions}
						{renderComponent}
					/>
				</div>
			{/if}
		</div>

		{#if hasMedia}
			<div class="relative mx-auto w-full max-w-xl lg:max-w-none">
				<div class="group relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-background/70 p-2 shadow-2xl shadow-primary/5 backdrop-blur-sm">
					<div class="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>

					{#if hasSlot("media")}
						<CanvasRenderNodes
							nodes={nodeSlots.media}
							basePath={[...nodePath, "slot:media"]}
							{componentCatalog}
							{customComponents}
							{providerData}
							{providerActions}
							{renderComponent}
						/>
					{/if}

					{#if hasSlot("mediaOverlay")}
						<CanvasRenderNodes
							nodes={nodeSlots.mediaOverlay}
							basePath={[...nodePath, "slot:mediaOverlay"]}
							{componentCatalog}
							{customComponents}
							{providerData}
							{providerActions}
							{renderComponent}
						/>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</section>
