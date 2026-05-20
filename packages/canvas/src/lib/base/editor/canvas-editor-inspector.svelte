<script lang="ts">
	import type { CanvasComponentCatalog, CanvasNode } from "$lib/base/canvas/types.js";
	import CanvasEditorAppInspector from "./canvas-editor-app-inspector.svelte";
	import CanvasEditorDocumentInspector from "./canvas-editor-document-inspector.svelte";
	import CanvasEditorNodeInspector from "./canvas-editor-node-inspector.svelte";
	import type { ComponentSelection, EditorComponent } from "./types.js";

	let {
		components = [],
		selection = undefined,
		documentConfig = {},
		documentEditorConfig = undefined,
		componentCatalog = {},
		editorConfig = {},
		appConfig = {},
		appEditorConfig = undefined,
		updateProperty = undefined,
		updateDocumentProperty = undefined,
		updateAppProperty = undefined,
		mode = "properties",
	}: {
		components?: CanvasNode[];
		selection?: ComponentSelection;
		documentConfig?: Record<string, any>;
		documentEditorConfig?: EditorComponent<any>;
		componentCatalog?: CanvasComponentCatalog;
		editorConfig?: Record<string, EditorComponent<any>>;
		appConfig?: Record<string, any>;
		appEditorConfig?: EditorComponent<any>;
		updateProperty?: (path: string[], property: string, value: any) => void;
		updateDocumentProperty?: (property: string, value: any) => void;
		updateAppProperty?: (property: string, value: any) => void;
		mode?: "properties" | "app";
	} = $props();
</script>

{#if mode === "app"}
	<CanvasEditorAppInspector {appConfig} {appEditorConfig} {updateAppProperty} />
{:else if selection}
	<CanvasEditorNodeInspector
		{components}
		{selection}
		{componentCatalog}
		{editorConfig}
		{updateProperty}
	/>
{:else}
	<CanvasEditorDocumentInspector {documentConfig} {documentEditorConfig} {updateDocumentProperty} />
{/if}
