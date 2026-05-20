<script lang="ts" module>
import type { EditorComponent } from "../editor/types.ts";
import type { CanvasProps as CanvasComponentProps } from "./types.js";

export interface CanvasConfig extends EditorComponent<CanvasComponentProps> {}

export const canvasConfig: CanvasConfig = {
	props: {
		components: [],
	},
	editorConfig: {
		fields: {
			components: {
				type: "text",
				label: "Components",
				description: "JSON array of component definitions",
			},
		},
	},
};
</script>

<script lang="ts">
import CanvasRenderNodes from "./render-nodes.svelte";
import type { CanvasProps } from "./types.js";

let {
	document = undefined,
	components = [],
	providers = [],
	providerData = {},
	providerActions = {},
	componentCatalog = {},
	class: className = "",
	customComponents = undefined,
	renderComponent,
	...restProps
}: CanvasProps = $props();

let resolvedComponents = $derived(document?.components ?? components);
let resolvedProviders = $derived(document?.providers ?? providers);
let resolvedDocumentProps = $derived(document?.props ?? {});
let resolvedDocumentClassName = $derived((resolvedDocumentProps as { class?: string }).class ?? "");
let resolvedDocumentStyle = $derived((resolvedDocumentProps as { style?: string }).style);
let resolvedDocumentRestProps = $derived.by(() => {
	const { class: _className, style: _style, ...documentRestProps } = resolvedDocumentProps as Record<string, unknown>;
	return documentRestProps;
});
let resolvedProviderData = $derived.by(() => {
	const entries = resolvedProviders.map((provider) => [provider.name, provider.props ?? {}] as const);
	return {
		...Object.fromEntries(entries),
		...providerData,
	};
});
</script>

<div class={["canvas", className]} data-component="canvas" {...restProps}>
	<div
		class={["canvas-document", resolvedDocumentClassName]}
		data-canvas-document
		style={resolvedDocumentStyle}
		{...resolvedDocumentRestProps}
	>
		<CanvasRenderNodes
			nodes={resolvedComponents}
			{componentCatalog}
			{customComponents}
			providerData={resolvedProviderData}
			{providerActions}
			{renderComponent}
		/>
	</div>
</div>

<style>
	.canvas {
		position: relative;
		min-height: 1rem;
		min-width: 1rem;
	}

	.canvas-error {
		padding: 0.5rem;
		border: 0.25rem dashed rgb(220, 38, 38);
		color: rgb(220, 38, 38);
		background-color: rgba(220, 38, 38, 0.1);
		border-radius: 0.25rem;
		font-family: monospace;
		font-size: 0.875rem;
		margin: 0.25rem 0;
	}
</style>
