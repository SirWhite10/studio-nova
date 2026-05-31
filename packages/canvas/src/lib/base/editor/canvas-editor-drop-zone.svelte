<script lang="ts">
	import type { CanvasComponentCatalog } from "$lib/base/canvas/types.js";
	import { cn } from "$lib/utils.js";
	import { getEditorContext } from "./context.js";
	import type { ComponentSelection } from "./types.js";
	import { createNodeFromCatalogEntry, getInsertionTargetsForType } from "./utils.js";

	let {
		componentCatalog = {},
		selection = undefined,
		class: className = "",
	}: {
		componentCatalog?: CanvasComponentCatalog;
		selection?: ComponentSelection;
		class?: string;
	} = $props();

	const editorContext = getEditorContext();
	let dragActive = $state(false);
	let previewLabel = $state("Drop to add component");

	function readComponentType(event: DragEvent) {
		return event.dataTransfer?.getData("application/x-studio-nova-component") || event.dataTransfer?.getData("text/plain") || "";
	}

	function resolveDropTarget(componentType: string) {
		const targets = getInsertionTargetsForType(selection?.component, selection?.path, componentType, componentCatalog);
		return targets[0] ?? { label: "Add to canvas", path: undefined };
	}

	function handleDragOver(event: DragEvent) {
		const componentType = readComponentType(event);
		if (!componentType || !componentCatalog[componentType]) return;
		event.preventDefault();
		dragActive = true;
		const target = resolveDropTarget(componentType);
		previewLabel = `${componentCatalog[componentType]?.label ?? componentType} · ${target.label}`;
		if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
	}

	function handleDrop(event: DragEvent) {
		const componentType = readComponentType(event);
		if (!componentType || !componentCatalog[componentType]) return;
		event.preventDefault();
		const target = resolveDropTarget(componentType);
		editorContext.addComponent(createNodeFromCatalogEntry(componentCatalog[componentType]), target.path);
		dragActive = false;
	}
</script>

<div
	class={cn("canvas-editor-drop-zone", dragActive && "canvas-editor-drop-zone-active", className)}
	ondragenter={handleDragOver}
	ondragover={handleDragOver}
	ondragleave={(event) => {
		if (event.currentTarget === event.target) dragActive = false;
	}}
	ondrop={handleDrop}
	aria-live="polite"
>
	{#if dragActive}
		<div class="canvas-editor-drop-zone-preview">
			<div class="canvas-editor-drop-zone-line"></div>
			<div class="canvas-editor-drop-zone-label">{previewLabel}</div>
		</div>
	{/if}
</div>

<style>
	.canvas-editor-drop-zone {
		position: absolute;
		inset: 0;
		z-index: 30;
		pointer-events: none;
	}

	.canvas-editor-drop-zone-active,
	.canvas-editor-drop-zone:global(:has(.canvas-editor-drop-zone-preview)) {
		pointer-events: auto;
	}

	.canvas-editor-drop-zone-preview {
		position: absolute;
		inset: 1rem;
		display: grid;
		place-items: center;
		border: 2px dashed color-mix(in oklab, var(--primary), transparent 25%);
		border-radius: 1.25rem;
		background: color-mix(in oklab, var(--primary), transparent 92%);
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--primary), transparent 70%);
	}

	.canvas-editor-drop-zone-line {
		position: absolute;
		left: 2rem;
		right: 2rem;
		top: 50%;
		height: 3px;
		border-radius: 999px;
		background: var(--primary);
		box-shadow: 0 0 0 4px color-mix(in oklab, var(--primary), transparent 85%);
	}

	.canvas-editor-drop-zone-label {
		position: relative;
		z-index: 1;
		border: 1px solid color-mix(in oklab, var(--primary), transparent 60%);
		border-radius: 999px;
		background: var(--background);
		color: var(--foreground);
		padding: 0.45rem 0.75rem;
		font-size: 0.78rem;
		font-weight: 700;
		box-shadow: 0 12px 28px color-mix(in oklab, var(--foreground), transparent 88%);
	}
</style>
