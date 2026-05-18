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

<section class={cn("w-full", className)}>
	<div class="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
		<div class="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
			<div class="flex flex-col gap-4">
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
				<div class="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
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
			<div class="group relative overflow-hidden rounded-xl">
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
		{/if}
	</div>
</section>
