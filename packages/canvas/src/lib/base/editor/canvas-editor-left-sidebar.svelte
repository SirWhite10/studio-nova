<script lang="ts">
	import type { Snippet } from "svelte";
	import type { CanvasComponentCatalog, CanvasNode } from "$lib/base/canvas/types.js";
	import * as Sidebar from "$lib/components/view-ui/sidebar/index.js";
	import { cn } from "$lib/utils.js";
	import { getEditorContext } from "./context.js";
	import CanvasEditorNavRail from "./canvas-editor-nav-rail.svelte";
	import type { ComponentSelection, EditorAppSection, EditorLeftPanel } from "./types.js";
	import {
		buildEditorLayerTree,
		createNodeFromCatalogEntry,
		formatComponentType,
		getCatalogCategories,
		getComponentInsertionTargets,
	} from "./utils.js";

	let {
		components = [],
		selection = undefined,
		componentCatalog = {},
		activePanel = "Outline",
		appName = "Canvas App",
		onPanelChange = undefined,
		onSelectAppSection = undefined,
		onOpenPages = undefined,
		onOpenEditorSettings = undefined,
		leftSidebar = undefined,
		shell = "desktop",
	}: {
		components?: CanvasNode[];
		selection?: ComponentSelection;
		componentCatalog?: CanvasComponentCatalog;
		activePanel?: EditorLeftPanel;
		appName?: string;
		onPanelChange?: (panel: EditorLeftPanel) => void;
		onSelectAppSection?: (section: EditorAppSection) => void;
		onOpenPages?: () => void;
		onOpenEditorSettings?: () => void;
		leftSidebar?: Snippet;
		shell?: "desktop" | "body";
	} = $props();

	const editorContext = getEditorContext();
	const layerTree = $derived(buildEditorLayerTree(components, componentCatalog));
	const catalogCategories = $derived(getCatalogCategories(componentCatalog));

	function selectLayer(component: CanvasNode, path: string[]) {
		editorContext.setSelection({ component, path });
	}

	function handleAddComponent(type: string, path?: string[]) {
		const definition = componentCatalog[type];
		if (!definition) return;
		editorContext.addComponent(createNodeFromCatalogEntry(definition), path);
	}

	function handlePaletteDragStart(event: DragEvent, type: string) {
		event.dataTransfer?.setData("application/x-studio-nova-component", type);
		event.dataTransfer?.setData("text/plain", type);
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = "copy";
		}
	}
</script>

{#snippet renderLayerNode(node: import("./utils.js").EditorLayerNode, depth = 0)}
	<div class="canvas-editor-layer-node">
		<button
			type="button"
			class={cn(
				"canvas-editor-layer-button",
				selection?.path?.join("/") === node.path.join("/") && "canvas-editor-layer-button-active",
			)}
			onclick={() => selectLayer(node.component, node.path)}
		>
			<span class="canvas-editor-layer-label">{node.label}</span>
			{#if node.component.id}
				<span class="canvas-editor-layer-meta">#{node.component.id}</span>
			{/if}
		</button>

		{#if node.slotChildren.length}
			<div class="canvas-editor-layer-children">
				{#each node.slotChildren as slotGroup}
					<div class="canvas-editor-layer-slot">
						<div class="canvas-editor-layer-slot-label">{slotGroup.label}</div>
						{#each slotGroup.children as slotChild}
							{@render renderLayerNode(slotChild, depth + 1)}
						{/each}
					</div>
				{/each}
			</div>
		{/if}

		{#if node.children.length}
			<div class="canvas-editor-layer-children">
				{#each node.children as child}
					{@render renderLayerNode(child, depth + 1)}
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

{#snippet panelBody()}
	<div class="canvas-editor-left-sidebar-body">
		{#if leftSidebar}
			{@render leftSidebar()}
		{:else if activePanel === "Outline"}
			<div class="canvas-editor-left-sidebar-scroll">
				{#if layerTree.length}
					{#each layerTree as layerNode}
						{@render renderLayerNode(layerNode)}
					{/each}
				{:else}
					<div class="canvas-editor-left-sidebar-empty">No components on the canvas yet.</div>
				{/if}
			</div>
		{:else if activePanel === "Fields"}
			<div class="canvas-editor-left-sidebar-scroll">
				<section class="canvas-editor-left-sidebar-section">
					<h3 class="canvas-editor-left-sidebar-section-title">Field Inspector</h3>
					<div class="canvas-editor-left-sidebar-empty">
						{#if selection}
							Select fields and component actions in the right inspector for {formatComponentType(selection.component.type)}.
						{:else}
							Select a component on the canvas to edit its schema-driven fields.
						{/if}
					</div>
				</section>
			</div>
		{:else if activePanel === "Components"}
			<div class="canvas-editor-left-sidebar-scroll">
				{#each catalogCategories as group}
					<section class="canvas-editor-left-sidebar-section">
						<h3 class="canvas-editor-left-sidebar-section-title">{group.category}</h3>
						<div class="canvas-editor-left-sidebar-component-list">
							{#each group.components as definition}
								{@const insertionTargets = getComponentInsertionTargets(
									selection?.component,
									selection?.path,
									definition,
									componentCatalog,
								)}
								<div
									class="canvas-editor-left-sidebar-component-card"
									draggable="true"
									ondragstart={(event) => handlePaletteDragStart(event, definition.type)}
								>
									<div class="canvas-editor-left-sidebar-component-title">
										{definition.label ?? formatComponentType(definition.type)}
									</div>
									{#if definition.description}
										<p class="canvas-editor-left-sidebar-component-description">{definition.description}</p>
									{/if}
									<div class="canvas-editor-left-sidebar-component-actions">
										{#if insertionTargets.length}
											{#each insertionTargets as target}
												<button
													type="button"
													class="canvas-editor-left-sidebar-button"
													onclick={() => handleAddComponent(definition.type, target.path)}
												>
													{target.label}
												</button>
											{/each}
										{:else}
											<span class="canvas-editor-left-sidebar-disabled">Not allowed for current selection</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

{#if shell === "body"}
	<div class="canvas-editor-left-sidebar-mobile-shell">{@render panelBody()}</div>
{:else}
	<div class="canvas-editor-left-sidebar-root">
		<div class="canvas-editor-left-sidebar-shell">
			<div class="canvas-editor-left-sidebar-rail-column">
				<CanvasEditorNavRail {activePanel} {appName} onSelect={onPanelChange} onSelectAppSection={onSelectAppSection} {onOpenPages} {onOpenEditorSettings} />
			</div>
			<div class="canvas-editor-left-sidebar-panel-column">
				<Sidebar.Header class="border-b border-black/8 px-0 py-0">
					<div class="canvas-editor-left-sidebar-title">{activePanel}</div>
				</Sidebar.Header>
				<Sidebar.Content class="min-h-0 p-0">
					<Sidebar.Group class="min-h-0 p-0">{@render panelBody()}</Sidebar.Group>
				</Sidebar.Content>
			</div>
		</div>
	</div>
{/if}

<style>
	.canvas-editor-left-sidebar-root {
		height: 100%;
		min-height: 0;
		width: 100%;
		background: color-mix(in oklab, var(--background), var(--muted) 28%);
		color: var(--foreground);
		box-shadow: inset -1px 0 0 var(--border);
	}

	.canvas-editor-left-sidebar-shell {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		height: 100%;
		min-height: 0;
	}

	.canvas-editor-left-sidebar-rail-column {
		height: 100%;
		min-height: 0;
		background: color-mix(in oklab, var(--background), var(--muted) 40%);
	}

	.canvas-editor-left-sidebar-panel-column {
		display: flex;
		min-width: 0;
		min-height: 0;
		flex-direction: column;
		border-left: 1px solid var(--border);
		background: color-mix(in oklab, var(--background), var(--muted) 28%);
	}

	.canvas-editor-left-sidebar-title {
		display: flex;
		align-items: center;
		min-height: 3.25rem;
		padding: 0 1rem;
		background: color-mix(in oklab, var(--background), var(--muted) 24%);
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: color-mix(in oklab, var(--foreground), transparent 28%);
	}

	.canvas-editor-left-sidebar-body,
	.canvas-editor-left-sidebar-scroll,
	.canvas-editor-left-sidebar-component-list,
	.canvas-editor-left-sidebar-component-actions {
		display: grid;
		gap: 0.875rem;
	}

	.canvas-editor-left-sidebar-mobile-shell {
		display: flex;
		flex-direction: column;
		min-height: 0;
		max-height: 60vh;
	}

	.canvas-editor-left-sidebar-body {
		min-height: 0;
		height: 100%;
	}

	.canvas-editor-left-sidebar-scroll {
		padding: 1rem;
		overflow: auto;
	}

	.canvas-editor-left-sidebar-section {
		display: grid;
		gap: 0.75rem;
	}

	.canvas-editor-left-sidebar-section-title {
		margin: 0;
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: color-mix(in oklab, var(--foreground), transparent 28%);
	}

	.canvas-editor-left-sidebar-empty,
	.canvas-editor-left-sidebar-disabled {
		font-size: 0.78rem;
		color: color-mix(in oklab, var(--foreground), transparent 48%);
	}

	.canvas-editor-left-sidebar-component-card {
		display: grid;
		gap: 0.75rem;
		padding: 0.875rem;
		border: 1px solid var(--border);
		border-radius: 1rem;
		background: color-mix(in oklab, var(--background), transparent 8%);
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
	}

	.canvas-editor-left-sidebar-component-title {
		font-size: 0.9rem;
		font-weight: 650;
	}

	.canvas-editor-left-sidebar-component-description {
		margin: 0.25rem 0 0;
		font-size: 0.78rem;
		line-height: 1.45;
		color: color-mix(in oklab, var(--foreground), transparent 36%);
	}

	.canvas-editor-left-sidebar-button {
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		background: var(--background);
		color: var(--foreground);
		padding: 0.5rem 0.75rem;
		font: inherit;
		font-size: 0.78rem;
		cursor: pointer;
	}

	.canvas-editor-layer-node {
		display: grid;
		gap: 0.375rem;
	}

	.canvas-editor-layer-children {
		display: grid;
		gap: 0.375rem;
		margin-left: 0.75rem;
		padding-left: 0.75rem;
		border-left: 1px solid var(--border);
	}

	.canvas-editor-layer-slot {
		display: grid;
		gap: 0.375rem;
	}

	.canvas-editor-layer-slot-label {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: color-mix(in oklab, var(--foreground), transparent 45%);
	}

	.canvas-editor-layer-button {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		background: color-mix(in oklab, var(--background), transparent 10%);
		color: var(--foreground);
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
		padding: 0.5rem 0.75rem;
		font: inherit;
		font-size: 0.8rem;
		cursor: pointer;
		text-align: left;
	}

	.canvas-editor-layer-button-active {
		border-color: var(--foreground);
		background: var(--foreground);
		color: var(--background);
	}

	.canvas-editor-layer-label {
		font-weight: 600;
	}

	.canvas-editor-layer-meta {
		font-size: 0.72rem;
		opacity: 0.68;
	}
</style>
