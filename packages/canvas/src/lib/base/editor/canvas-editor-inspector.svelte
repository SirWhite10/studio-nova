<script lang="ts">
	import type { CanvasComponentCatalog, CanvasNode } from "$lib/base/canvas/types.js";
	import CanvasEditorAppInspector from "./canvas-editor-app-inspector.svelte";
	import CanvasEditorNodeInspector from "./canvas-editor-node-inspector.svelte";
	import type { ComponentSelection, EditorComponent } from "./types.js";

	let {
		components = [],
		selection = undefined,
		documentSelection = undefined,
		componentCatalog = {},
		editorConfig = {},
		appConfig = {},
		appEditorConfig = undefined,
		updateProperty = undefined,
		updateAppProperty = undefined,
		mode = "properties",
	}: {
		components?: CanvasNode[];
		selection?: ComponentSelection;
		documentSelection?: ComponentSelection;
		componentCatalog?: CanvasComponentCatalog;
		editorConfig?: Record<string, EditorComponent<any>>;
		appConfig?: Record<string, any>;
		appEditorConfig?: EditorComponent<any>;
		updateProperty?: (path: string[], property: string, value: any) => void;
		updateAppProperty?: (property: string, value: any) => void;
		mode?: "properties" | "app";
	} = $props();

	const activeSelection = $derived(selection ?? documentSelection);
</script>

{#if mode === "app"}
	<CanvasEditorAppInspector {appConfig} {appEditorConfig} {updateAppProperty} />
{:else if activeSelection}
	<CanvasEditorNodeInspector
		{components}
		selection={activeSelection}
		{componentCatalog}
		{editorConfig}
		{updateProperty}
	/>
{:else}
	<CanvasEditorNodeInspector
		{components}
		selection={documentSelection}
		{componentCatalog}
		{editorConfig}
		{updateProperty}
	/>
{/if}
