<script lang="ts">
	import { SvelteMap } from "svelte/reactivity";
	import type {
		CanvasComponentCatalog,
		CanvasNode,
		CanvasProviderActions,
		CanvasProviderData,
		ComponentRegistryValue,
		RenderComponentFn,
	} from "./types.js";
	import CanvasRenderNode from "./render-node.svelte";

	let {
		nodes = [],
		basePath = [],
		componentCatalog = {},
		customComponents = new SvelteMap(),
		providerData = {},
		providerActions = {},
		renderComponent = undefined,
	}: {
		nodes?: CanvasNode[];
		basePath?: string[];
		componentCatalog?: CanvasComponentCatalog;
		customComponents?: SvelteMap<string, ComponentRegistryValue>;
		providerData?: CanvasProviderData;
		providerActions?: CanvasProviderActions;
		renderComponent?: RenderComponentFn;
	} = $props();
</script>

{#each nodes as node, index (node.id || node.type)}
	<CanvasRenderNode
		{node}
		path={[...basePath, `${index}`]}
		{componentCatalog}
		{customComponents}
		{providerData}
		{providerActions}
		{renderComponent}
	/>
{/each}
