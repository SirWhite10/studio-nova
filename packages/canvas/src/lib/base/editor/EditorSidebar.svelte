<script lang="ts">
import { cn } from "$lib/utils.js";
import EditorField from "./fields/EditorField.svelte";
import { getEditorContext } from "./context.js";
import {
	buildEditorBreadcrumbs,
	buildEditorLayerTree,
	createNodeFromCatalogEntry,
	formatComponentType,
	getCatalogCategories,
	getComponentInsertionTargets,
	getInsertionTargetsForType,
	isMobileDevice,
	resolveEditorComponent,
} from "./utils.js";
import SettingsIcon from "@lucide/svelte/icons/settings";
import XIcon from "@lucide/svelte/icons/x";
import type { CanvasNode } from "$lib/base/canvas/types.js";
import type { EditorComponent, EditorSidebarProps } from "./types.js";

const isBrowser = typeof window !== "undefined";

let {
	mode = $bindable("docked"),
	components = $bindable([]),
	selection = $bindable(undefined),
	clipboardAvailable = $bindable(false),
	clipboardNode = $bindable(undefined),
	componentCatalog = $bindable({}),
	editorConfig = $bindable({}),
	updateProperty = $bindable(() => {}),
	class: className = "",
	isDraggable = $bindable(false),
	activePanel = $bindable("Properties"),
}: EditorSidebarProps = $props();

let isOpen = $state(false);
let isDragging = $state(false);
let draggedPath = $state<string[] | undefined>(undefined);
let dropTargetPath = $state<string[] | undefined>(undefined);
let isMobile = $state(false);

const componentConfig = $derived(
	resolveEditorComponent(selection?.component?.type, componentCatalog, editorConfig),
);

const componentProps = $derived(selection?.component?.props || {});
const editorGroups = $derived(componentConfig?.editorConfig?.groups || {});
const editorFields = $derived(componentConfig?.editorConfig?.fields || {});
const filteredGroups = $derived(
	Object.entries(editorGroups)
		.filter(([_, group]) => group.fields && group.fields.length > 0)
		.map(([key, group]) => ({
			name: key,
			config: group,
			fields:
				group.fields
					?.map((fieldName) => ({
						name: fieldName,
						config: editorFields[fieldName],
					}))
					.filter((field) => field.config) || [],
		}))
		.filter((group) => group.fields.length > 0),
);

const ungroupedFields = $derived(
	Object.entries(editorFields)
		.filter(([key]) => {
			// Check if this field is in any group
			return !Object.values(editorGroups).some((group) =>
				group.fields?.includes(key),
			);
		})
		.map(([key, field]) => ({
			name: key,
			config: field,
		})),
);

const catalogCategories = $derived(getCatalogCategories(componentCatalog));
const layerTree = $derived(buildEditorLayerTree(components, componentCatalog));
const breadcrumbs = $derived(
	buildEditorBreadcrumbs(components, selection?.path, componentCatalog),
);
const clipboardInsertionTargets = $derived(
	getInsertionTargetsForType(
		selection?.component,
		selection?.path,
		clipboardNode?.type,
		componentCatalog,
	),
);
const editorContext = getEditorContext();

function handlePropertyChange(propertyName: string, value: object) {
	if (updateProperty && selection) {
		updateProperty(selection.path, propertyName, value);
	}
}

function handleAddComponent(type: string, path?: string[]) {
	const definition = componentCatalog[type];
	if (!definition) {
		return;
	}

	editorContext.addComponent(createNodeFromCatalogEntry(definition), path);
}

function selectLayer(component: CanvasNode, path: string[]) {
	editorContext.setSelection({ component, path });
}

function startLayerDrag(path: string[]) {
	draggedPath = [...path];
	isDragging = true;
}

function clearDragState() {
	draggedPath = undefined;
	dropTargetPath = undefined;
	isDragging = false;
}

function handleLayerDrop(targetPath: string[]) {
	if (!draggedPath?.length || draggedPath.join("/") === targetPath.join("/")) {
		clearDragState();
		return;
	}

	if (draggedPath.slice(0, -1).join("/") !== targetPath.slice(0, -1).join("/")) {
		clearDragState();
		return;
	}

	const targetIndex = Number.parseInt(targetPath[targetPath.length - 1] ?? "", 10);
	if (!Number.isNaN(targetIndex)) {
		editorContext.moveComponent(draggedPath, targetIndex);
	}
	clearDragState();
}

function moveLayerBy(delta: number, path: string[]) {
	const currentIndex = Number.parseInt(path[path.length - 1] ?? "", 10);
	if (Number.isNaN(currentIndex)) {
		return;
	}

	editorContext.moveComponent(path, currentIndex + delta);
}

function deleteLayer(path: string[]) {
	editorContext.deleteComponent(path);
}

function copyLayer(path: string[]) {
	editorContext.copyComponent(path);
}

function duplicateLayer(path: string[]) {
	editorContext.duplicateComponent(path);
}

function pasteInto(path?: string[]) {
	editorContext.pasteComponent(path);
}

$effect(() => {
	if (isBrowser) {
		isMobile = isMobileDevice();
	}
});

$effect(() => {
	if (isMobile && selection && activePanel === "Properties") {
		isOpen = true;
	}
});
</script>

{#snippet renderLayerNode(node: import("./utils.js").EditorLayerNode, depth = 0)}
	<div class="editor-layer-node" style={`--layer-depth:${depth};`}>
		<button
			type="button"
			draggable="true"
			class={cn(
				"editor-layer-button",
				dropTargetPath?.join("/") === node.path.join("/") && "editor-layer-button-drop-target",
				selection?.path?.join("/") === node.path.join("/") && "editor-layer-button-active",
			)}
			onclick={() => selectLayer(node.component, node.path)}
			ondragstart={() => startLayerDrag(node.path)}
			ondragover={(event) => {
				event.preventDefault();
				dropTargetPath = [...node.path];
			}}
			ondragleave={() => {
				if (dropTargetPath?.join("/") === node.path.join("/")) {
					dropTargetPath = undefined;
				}
			}}
			ondragend={clearDragState}
			ondrop={(event) => {
				event.preventDefault();
				handleLayerDrop(node.path);
			}}
		>
			<span class="editor-layer-label">{node.label}</span>
			{#if node.component.id}
				<span class="editor-layer-meta">#{node.component.id}</span>
			{/if}
		</button>

		{#if isMobile && selection?.path?.join("/") === node.path.join("/")}
			<div class="editor-layer-mobile-actions">
				<button
					type="button"
					class="editor-layer-action-button"
					onclick={() => copyLayer(node.path)}
				>
					Copy
				</button>
				<button
					type="button"
					class="editor-layer-action-button"
					onclick={() => duplicateLayer(node.path)}
				>
					Duplicate
				</button>
				<button
					type="button"
					class="editor-layer-action-button"
					onclick={() => moveLayerBy(-1, node.path)}
				>
					Move up
				</button>
				<button
					type="button"
					class="editor-layer-action-button"
					onclick={() => moveLayerBy(1, node.path)}
				>
					Move down
				</button>
				<button
					type="button"
					class="editor-layer-action-button editor-layer-action-destructive"
					onclick={() => deleteLayer(node.path)}
				>
					Delete
				</button>
			</div>
		{/if}

		{#if node.slotChildren.length}
			<div class="editor-layer-children">
				{#each node.slotChildren as slotGroup}
					<div class="editor-layer-slot">
						<div class="editor-layer-slot-label">{slotGroup.label}</div>
						{#each slotGroup.children as slotChild}
							{@render renderLayerNode(slotChild, depth + 1)}
						{/each}
					</div>
				{/each}
			</div>
		{/if}

		{#if node.children.length}
			<div class="editor-layer-children">
				{#each node.children as child}
					{@render renderLayerNode(child, depth + 1)}
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<div
	class={cn("editor-sidebar", isMobile && isOpen && "editor-sidebar-mobile", className)}
	data-active-panel={activePanel}
>
	<div class="editor-sidebar-header">
		{#if isMobile}
			<div class="editor-sidebar-handle" aria-hidden="true"></div>
		{/if}
		<h2 class="editor-sidebar-title">
			{activePanel === "Properties" && selection?.component
				? formatComponentType(selection.component.type)
				: activePanel}
		</h2>
		{#if isMobile}
			<button
				type="button"
				class="editor-sidebar-close"
				onclick={() => editorContext.setSidebarVisible(false)}
				aria-label="Close editor panel"
			>
				<XIcon size={18} />
			</button>
		{/if}
	</div>

	<div class="editor-sidebar-content">
		{#if activePanel === "Properties"}
			{#if selection && componentConfig}
				<div class="editor-sidebar-section-stack">
					{#if breadcrumbs.length}
						<section class="editor-sidebar-section">
							<h3 class="editor-sidebar-section-title">Selection</h3>
							<div class="editor-breadcrumbs">
								{#each breadcrumbs as crumb}
									{#if crumb.isSlot}
										<span class="editor-breadcrumb editor-breadcrumb-slot">
											{crumb.label}
										</span>
									{:else}
										<button
											type="button"
											class={cn(
												"editor-breadcrumb",
												selection?.path?.join("/") === crumb.path.join("/") && "editor-breadcrumb-active",
											)}
											onclick={() => crumb.component && selectLayer(crumb.component, crumb.path)}
										>
											{crumb.label}
										</button>
									{/if}
								{/each}
							</div>
						</section>
					{/if}
					{#if filteredGroups.length > 0}
						{#each filteredGroups as group}
							<section class="editor-sidebar-section">
								<h3 class="editor-sidebar-section-title">{group.config.label || group.name}</h3>
								<div class="editor-sidebar-fields">
									{#each group.fields as field}
										<EditorField
											name={field.name}
											config={field.config}
											value={componentProps[field.name]}
											onChange={(value) => handlePropertyChange(field.name, value)}
										/>
									{/each}
								</div>
							</section>
						{/each}
					{/if}

					{#if ungroupedFields.length > 0}
						<section class="editor-sidebar-section">
							{#if filteredGroups.length > 0}
								<h3 class="editor-sidebar-section-title">Other Properties</h3>
							{/if}
							<div class="editor-sidebar-fields">
								{#each ungroupedFields as field}
									<EditorField
										name={field.name}
										config={field.config}
										value={componentProps[field.name]}
										onChange={(value) => handlePropertyChange(field.name, value)}
									/>
								{/each}
							</div>
						</section>
					{/if}
				</div>
			{:else}
				<div class="editor-sidebar-empty">
					<SettingsIcon class="editor-sidebar-empty-icon" />
					<p>Select a component to edit its properties.</p>
				</div>
			{/if}
		{:else if activePanel === "Layers"}
			<div class="editor-sidebar-section-stack">
				{#if selection}
					<section class="editor-sidebar-section">
						<h3 class="editor-sidebar-section-title">Insert Here</h3>
				{#if clipboardAvailable}
							{#if clipboardInsertionTargets.length}
								{#each clipboardInsertionTargets as target}
									<button
										type="button"
										class="editor-sidebar-button"
										onclick={() => pasteInto(target.path)}
									>
										Paste copied component
										<span class="editor-layer-meta">{target.label}</span>
									</button>
								{/each}
							{:else}
								<div class="editor-sidebar-placeholder">
									The copied component cannot be inserted here.
								</div>
							{/if}
						{/if}
						<div class="editor-sidebar-component-list">
							{#each catalogCategories as group}
								<div class="editor-layer-insert-group">
									<div class="editor-layer-slot-label">{group.category}</div>
									<div class="editor-sidebar-component-actions">
										{#each group.components as definition}
											{@const insertionTargets = getComponentInsertionTargets(
												selection.component,
												selection.path,
												definition,
												componentCatalog,
											)}
											{#each insertionTargets as target}
												<button
													class="editor-sidebar-button"
													type="button"
													onclick={() => handleAddComponent(definition.type, target.path)}
												>
													{definition.label ?? formatComponentType(definition.type)}
													<span class="editor-layer-meta">{target.label}</span>
												</button>
											{/each}
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/if}
				{#if layerTree.length}
					{#each layerTree as layerNode}
						{@render renderLayerNode(layerNode)}
					{/each}
				{:else}
					<div class="editor-sidebar-placeholder">
						No components on the canvas yet.
					</div>
				{/if}
			</div>
		{:else if activePanel === "Components"}
			<div class="editor-sidebar-section-stack">
				{#each catalogCategories as group}
					<section class="editor-sidebar-section">
						<h3 class="editor-sidebar-section-title">{group.category}</h3>
						<div class="editor-sidebar-component-list">
							{#each group.components as definition}
								{@const insertionTargets = getComponentInsertionTargets(
									selection?.component,
									selection?.path,
									definition,
									componentCatalog,
								)}
								<div class="editor-sidebar-component-card">
									<div class="editor-sidebar-component-copy">
										<div class="editor-sidebar-component-title">
											{definition.label ?? formatComponentType(definition.type)}
										</div>
										{#if definition.description}
											<p class="editor-sidebar-component-description">{definition.description}</p>
										{/if}
									</div>
									<div class="editor-sidebar-component-actions">
										{#if insertionTargets.length}
											{#each insertionTargets as target}
												<button
													class="editor-sidebar-button"
													type="button"
													onclick={() => handleAddComponent(definition.type, target.path)}
												>
													{target.label}
												</button>
											{/each}
										{:else}
											<span class="editor-sidebar-disabled-label">
												Not allowed for current selection
											</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		{:else if activePanel === "Settings"}
			<div class="editor-sidebar-placeholder">
				Editor settings are not implemented yet.
			</div>
		{/if}
	</div>
</div>

<style>
	.editor-sidebar {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: min(24rem, 100%);
		border-left: 1px solid rgba(15, 23, 42, 0.08);
		background: #ffffff;
	}

	.editor-sidebar-mobile {
		position: fixed;
		inset: auto 0 0 0;
		max-height: 75vh;
		width: 100%;
		border-left: none;
		border-top: 1px solid rgba(15, 23, 42, 0.08);
		box-shadow: 0 -12px 48px rgba(15, 23, 42, 0.08);
		z-index: 20;
	}

	.editor-sidebar-header {
		padding: 1rem 1rem 0.75rem;
		border-bottom: 1px solid rgba(15, 23, 42, 0.08);
		position: sticky;
		top: 0;
		background: #ffffff;
		z-index: 2;
	}

	.editor-sidebar-title {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 650;
	}

	.editor-sidebar-handle {
		width: 3rem;
		height: 0.3125rem;
		border-radius: 999px;
		background: rgba(15, 23, 42, 0.16);
		margin: 0 auto 0.75rem;
	}

	.editor-sidebar-close {
		position: absolute;
		top: 0.875rem;
		right: 0.875rem;
		border: 1px solid rgba(15, 23, 42, 0.12);
		border-radius: 999px;
		background: #fff;
		width: 2.25rem;
		height: 2.25rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.editor-sidebar-content {
		flex: 1 1 auto;
		overflow: auto;
		padding: 1rem;
	}

	.editor-sidebar-section-stack,
	.editor-sidebar-component-list,
	.editor-sidebar-fields,
	.editor-sidebar-component-actions {
		display: grid;
		gap: 0.875rem;
	}

	.editor-sidebar-section {
		display: grid;
		gap: 0.75rem;
	}

	.editor-sidebar-section-title {
		margin: 0;
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: rgba(15, 23, 42, 0.72);
	}

	.editor-sidebar-empty,
	.editor-sidebar-placeholder {
		display: grid;
		place-items: center;
		min-height: 12rem;
		text-align: center;
		color: rgba(15, 23, 42, 0.6);
	}

	.editor-sidebar-empty-icon {
		width: 2rem;
		height: 2rem;
		margin-bottom: 0.75rem;
		opacity: 0.3;
	}

	.editor-sidebar-component-card {
		display: grid;
		gap: 0.75rem;
		padding: 0.875rem;
		border: 1px solid rgba(15, 23, 42, 0.08);
		border-radius: 1rem;
		background: rgba(248, 250, 252, 0.45);
	}

	.editor-sidebar-component-title {
		font-size: 0.9rem;
		font-weight: 650;
	}

	.editor-sidebar-component-description {
		margin: 0.25rem 0 0;
		font-size: 0.78rem;
		line-height: 1.45;
		color: rgba(15, 23, 42, 0.64);
	}

	.editor-sidebar-button {
		border: 1px solid rgba(15, 23, 42, 0.12);
		border-radius: 0.75rem;
		background: #fff;
		padding: 0.5rem 0.75rem;
		font: inherit;
		font-size: 0.78rem;
		cursor: pointer;
	}

	.editor-sidebar-disabled-label {
		font-size: 0.78rem;
		color: rgba(15, 23, 42, 0.52);
	}

	.editor-breadcrumbs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.editor-breadcrumb {
		border: 1px solid rgba(15, 23, 42, 0.12);
		border-radius: 999px;
		background: #fff;
		padding: 0.375rem 0.625rem;
		font: inherit;
		font-size: 0.76rem;
		cursor: pointer;
	}

	.editor-breadcrumb-active {
		background: #111827;
		color: #fff;
		border-color: #111827;
	}

	.editor-breadcrumb-slot {
		cursor: default;
		background: rgba(248, 250, 252, 0.9);
	}

	.editor-layer-node {
		display: grid;
		gap: 0.375rem;
	}

	.editor-layer-children {
		display: grid;
		gap: 0.375rem;
		margin-left: 0.75rem;
		padding-left: 0.75rem;
		border-left: 1px solid rgba(15, 23, 42, 0.08);
	}

	.editor-layer-slot {
		display: grid;
		gap: 0.375rem;
	}

	.editor-layer-slot-label {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: rgba(15, 23, 42, 0.55);
	}

	.editor-layer-button {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border: 1px solid rgba(15, 23, 42, 0.08);
		border-radius: 0.75rem;
		background: #fff;
		padding: 0.5rem 0.75rem;
		font: inherit;
		font-size: 0.8rem;
		cursor: pointer;
		text-align: left;
	}

	.editor-layer-button-active {
		border-color: #111827;
		background: #111827;
		color: #fff;
	}

	.editor-layer-button-drop-target {
		border-color: #0f766e;
		box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.15);
	}

	.editor-layer-label {
		font-weight: 600;
	}

	.editor-layer-meta {
		font-size: 0.72rem;
		opacity: 0.68;
	}

	.editor-layer-mobile-actions {
		display: none;
	}

	.editor-layer-action-button {
		border: 1px solid rgba(15, 23, 42, 0.12);
		border-radius: 0.625rem;
		background: #fff;
		padding: 0.5rem 0.625rem;
		font: inherit;
		font-size: 0.76rem;
		cursor: pointer;
	}

	.editor-layer-action-destructive {
		color: #b91c1c;
	}

	@media (max-width: 1023px) {
		.editor-sidebar {
			border-top-left-radius: 1.25rem;
			border-top-right-radius: 1.25rem;
			max-height: 82vh;
			overflow: hidden;
		}

		.editor-sidebar-content {
			padding-bottom: 1.5rem;
		}

		.editor-sidebar-button,
		.editor-breadcrumb,
		.editor-layer-button,
		.editor-layer-action-button {
			min-height: 44px;
		}

		.editor-layer-mobile-actions {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
		}
	}
</style>
