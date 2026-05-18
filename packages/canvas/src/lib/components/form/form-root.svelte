<script lang="ts">
	import type { Snippet } from "svelte";
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
	import CardRoot from "../card/card.svelte";
	import CardFooter from "../card/card-footer.svelte";

	let {
		title = "Form title",
		description = "Form description",
		submitLabel = "Save changes",
		cancelLabel = "Cancel",
		showCancel = true,
		onsubmit,
		oncancel,
		children,
		nodePath = [],
		nodeSlots = {},
		componentCatalog = {},
		customComponents = new SvelteMap<string, ComponentRegistryValue>(),
		providerData = {},
		providerActions = {},
		renderComponent = undefined,
		style = "",
		...restProps
	}: {
		title?: string;
		description?: string;
		submitLabel?: string;
		cancelLabel?: string;
		showCancel?: boolean;
		onsubmit?: (event: SubmitEvent) => void;
		oncancel?: (event: MouseEvent) => void;
		children?: Snippet;
		nodePath?: string[];
		nodeSlots?: Record<string, CanvasNode[]>;
		componentCatalog?: CanvasComponentCatalog;
		customComponents?: SvelteMap<string, ComponentRegistryValue>;
		providerData?: CanvasProviderData;
		providerActions?: CanvasProviderActions;
		renderComponent?: RenderComponentFn;
		style?: string;
		[key: string]: unknown;
	} = $props();

	const hasNamedSlots = $derived(
		Object.values(nodeSlots).some((nodes) => nodes.length > 0),
	);
</script>

<CardRoot style={style} {...restProps}>
	<form
		onsubmit={onsubmit}
		style="display: contents;"
	>
		{#if hasNamedSlots}
			{#if nodeSlots.header?.length}
				<CanvasRenderNodes
					nodes={nodeSlots.header}
					basePath={[...nodePath, "slot:header"]}
					{componentCatalog}
					{customComponents}
					{providerData}
					{providerActions}
					{renderComponent}
				/>
			{/if}
			{#if nodeSlots.content?.length}
				<CanvasRenderNodes
					nodes={nodeSlots.content}
					basePath={[...nodePath, "slot:content"]}
					{componentCatalog}
					{customComponents}
					{providerData}
					{providerActions}
					{renderComponent}
				/>
			{/if}
		{:else}
			{@render children?.()}
		{/if}

		<CardFooter style="gap: 0.75rem; justify-content: flex-start;">
			<button type="submit" class="form-root-button form-root-button-primary">
				{submitLabel}
			</button>
			{#if showCancel}
				<button
					type="button"
					class="form-root-button form-root-button-secondary"
					onclick={oncancel}
				>
					{cancelLabel}
				</button>
			{/if}
		</CardFooter>
	</form>
</CardRoot>

<style>
	.form-root-button {
		border-radius: 0.75rem;
		border: 1px solid rgba(15, 23, 42, 0.12);
		padding: 0.625rem 0.875rem;
		font: inherit;
		cursor: pointer;
	}

	.form-root-button-primary {
		background: #111827;
		color: #ffffff;
		border-color: #111827;
	}

	.form-root-button-secondary {
		background: #ffffff;
		color: #111827;
	}
</style>
