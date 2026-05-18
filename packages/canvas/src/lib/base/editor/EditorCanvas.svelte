<script lang="ts">
// Import icons
import Trash from "@lucide/svelte/icons/trash";
import { onMount } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import type { CanvasNode } from "$lib/base/canvas/types.js";
import { cn } from "$lib/utils.js";
import CanvasApp from "$lib/base/canvas-app/CanvasApp.svelte";
import CanvasRenderNode from "../canvas/render-node.svelte";
import { getEditorContext } from "./context.js";
import EditorComponentHighlight from "./EditorComponentHighlight.svelte";
import type { EditorCanvasProps } from "./types.js";
import { getComponentDisplayLabel } from "./utils.js";

const isBrowser = typeof window !== "undefined";

let {
	document = undefined,
	components = [],
	providers = [],
	providerData = {},
	providerActions = {},
	canvasAppConfig = undefined,
	mode = "edit",
	selection = undefined,
	onSelect = undefined,
	onHover = undefined,
	onRequestEdit = undefined,
	componentRegistry = new SvelteMap(),
	componentCatalog = {},
	renderComponent = undefined,
	class: className = "",
}: EditorCanvasProps = $props();

let resolvedDocument = $derived(
	document
		? {
				...document,
				components,
				providers: document.providers ?? providers,
			}
		: undefined,
);

// Local state
let hoveredComponent = $state<CanvasNode | undefined>(undefined);
let contextMenuComponent = $state<CanvasNode | undefined>(undefined);
let contextMenuPosition = $state({ x: 0, y: 0 });
let canvasElement = $state<HTMLElement | undefined>(undefined);

function resolveSelectionTarget(component: CanvasNode, path: string[]) {
	let currentComponent = component;
	let currentPath = [...path];

	while (
		!componentCatalog[currentComponent.type]?.editorConfig
		&& (currentComponent.type === "View" || currentComponent.kind === "primitive")
		&& !currentComponent.slots
		&& (currentComponent.children?.length ?? 0) === 1
	) {
		currentComponent = currentComponent.children![0];
		currentPath = [...currentPath, "0"];
	}

	return { component: currentComponent, path: currentPath };
}

// Handle component selection
function handleComponentSelect(component: CanvasNode, path: string[]) {
	const resolved = resolveSelectionTarget(component, path);
	if (onSelect) {
		onSelect(resolved as any);
	}
}

function handleEditRequest(component: CanvasNode, path: string[]) {
	const selection = resolveSelectionTarget(component, path);
	onSelect?.(selection as any);
	onRequestEdit?.(selection as any);
}

// Handle component hover
function handleComponentHover(component: CanvasNode | undefined) {
	hoveredComponent = component;

	if (onHover) {
		onHover(component);
	}
}

// Handle context menu
function handleContextMenu(
	event: MouseEvent,
	component: CanvasNode,
	path: string[],
) {
	event.preventDefault();

	contextMenuComponent = component;
	contextMenuPosition = { x: event.clientX, y: event.clientY };

	// Also select the component
	handleComponentSelect(component, path);
}

// Close context menu
function closeContextMenu() {
	contextMenuComponent = undefined;
}

// Handle canvas click to deselect
function handleCanvasClick(event: MouseEvent) {
	// Only handle clicks directly on the canvas, not on components
	if (event.target === canvasElement) {
		if (onSelect) {
			// Create a null selection to deselect
			onSelect(null as any); // Type casting as any to bypass type check
		}
	}
}

// Add canvas click handler on mount
onMount(() => {
	if (isBrowser && canvasElement) {
		canvasElement.addEventListener("click", handleCanvasClick);
	}

	return () => {
		if (isBrowser && canvasElement) {
			canvasElement.removeEventListener("click", handleCanvasClick);
		}
	};
});

const context = getEditorContext();
</script>

{#snippet renderComponentSnippetForChildren(component: CanvasNode, path: string[])}
  {@render renderComponent?.(component, path)}
{/snippet}

{#snippet renderEditorComponentSnippet(component: CanvasNode, path: string[] = [])}
  {@const isSelected = selection?.component?.id === component.id}
  {@const isHovered = hoveredComponent?.id === component.id}

  {#if mode === "edit"}
    <EditorComponentHighlight
      {component}
      label={getComponentDisplayLabel(component, componentCatalog)}
      {isSelected}
      {isHovered}
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        handleComponentSelect(component, path);
      }}
      onEdit={() => handleEditRequest(component, path)}
      onCopy={() => context.copyComponent(path)}
      onDuplicate={() => context.duplicateComponent(path)}
      onDelete={() => context.deleteComponent(path)}
      onHover={() => handleComponentHover(component)}
      onLeave={() => handleComponentHover(undefined)}
      onContextMenu={(e: MouseEvent) => handleContextMenu(e, component, path)}
    >
      <CanvasRenderNode
        node={component}
        {path}
        customComponents={componentRegistry}
        {componentCatalog}
        renderComponent={renderEditorComponentSnippet}
        renderCurrentComponent={false}
      />
    </EditorComponentHighlight>
  {:else}
    <CanvasRenderNode
      node={component}
      {path}
      customComponents={componentRegistry}
      {componentCatalog}
      renderComponent={renderEditorComponentSnippet}
      renderCurrentComponent={false}
    />
  {/if}
{/snippet}

<div
  class={cn("editor-canvas", className, {
    "editor-canvas-preview": mode === "preview",
  })}
  bind:this={canvasElement}
>
  <CanvasApp
    document={resolvedDocument}
    {components}
    {providers}
    {providerData}
    {providerActions}
    componentCatalog={componentCatalog}
    customComponents={componentRegistry}
    renderComponent={renderEditorComponentSnippet}
    config={canvasAppConfig}
  />

  {#if contextMenuComponent}
    <div
      class="editor-context-menu"
      style="position: fixed; left: {contextMenuPosition.x}px; top: {contextMenuPosition.y}px;"
    >
      <div class="context-menu-content">
        <button
          class="context-menu-item"
          onclick={() => {
            if ($context.selection)
              context.deleteComponent($context.selection.path);
            closeContextMenu();
          }}
        >
          <Trash class="mr-2 h-4 w-4" />
          Delete
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .editor-canvas {
    flex: 1 1 auto;
    position: relative;
    overflow: auto;
    height: 100%;
    padding: 0.5rem;
    padding-top: 1.5rem;
    background-color: var(--background);
  }

  .editor-canvas-preview {
    /* Preview mode specific styles */
    background-color: var(--background);
  }

  .editor-context-menu {
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background-color: var(--background);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    padding: 0.5rem;
    z-index: 100;
  }

  .context-menu-content {
    display: flex;
    flex-direction: column;
  }

  .context-menu-item {
    display: flex;
    align-items: center;
    padding: 0.5rem 0.75rem;
    font-size: 14px;
    cursor: pointer;
    border-radius: var(--radius);
    color: var(--foreground);
    background: transparent;
    border: none;
    text-align: left;
    width: 100%;
  }

  .context-menu-item:hover {
    background-color: var(--accent);
    background-color: var(--accent);
  }
</style>
