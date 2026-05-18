<script lang="ts">
	import type { CanvasComponentCatalog, CanvasNode } from "$lib/base/canvas/types.js";
	import { getEditorContext } from "./context.js";
	import EditorField from "./fields/EditorField.svelte";
	import type { ComponentSelection, EditorComponent } from "./types.js";
	import {
		buildEditorBreadcrumbs,
		formatComponentType,
		resolveEditorComponent,
	} from "./utils.js";

	let {
		components = [],
		selection = undefined,
		componentCatalog = {},
		editorConfig = {},
		updateProperty = undefined,
	}: {
		components?: CanvasNode[];
		selection?: ComponentSelection;
		componentCatalog?: CanvasComponentCatalog;
		editorConfig?: Record<string, EditorComponent<any>>;
		updateProperty?: (path: string[], property: string, value: any) => void;
	} = $props();

	const editorContext = getEditorContext();
	const componentConfig = $derived(
		resolveEditorComponent(selection?.component?.type, componentCatalog, editorConfig),
	);
	const activeEditorConfig = $derived(componentConfig?.editorConfig);
	const activeProps = $derived(selection?.component?.props || {});
	const editorGroups = $derived(activeEditorConfig?.groups || {});
	const editorFields = $derived(activeEditorConfig?.fields || {});
	const breadcrumbs = $derived(
		buildEditorBreadcrumbs(components, selection?.path, componentCatalog),
	);
	const slotEntries = $derived(
		Object.entries(selection?.component?.slots ?? {}).map(([slotName, slot]) => ({
			slotName,
			children: slot.children,
		})),
	);
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
			.filter(([key]) => !Object.values(editorGroups).some((group) => group.fields?.includes(key)))
			.map(([key, field]) => ({
				name: key,
				config: field,
			})),
	);

	function selectLayer(component: CanvasNode, path: string[]) {
		editorContext.setSelection({ component, path });
	}
</script>

{#if selection}
	{#if activeEditorConfig || slotEntries.length > 0}
		<div class="editor-sidebar-section-stack">
			{#if slotEntries.length > 0}
				<section class="editor-sidebar-section">
					<h3 class="editor-sidebar-section-title">Slot Content</h3>
					<div class="editor-sidebar-fields">
						{#each slotEntries as slotEntry}
							<div class="editor-slot-group">
								<div class="editor-slot-group-label">{slotEntry.slotName}</div>
								{#if slotEntry.children.length > 0}
									<div class="editor-slot-group-actions">
										{#each slotEntry.children as child, index}
											<button
												type="button"
												class="editor-slot-jump-button"
												onclick={() => selectLayer(child, [...selection.path, `slot:${slotEntry.slotName}`, `${index}`])}
											>
												{formatComponentType(child.type)}
											</button>
										{/each}
									</div>
								{:else}
									<div class="editor-sidebar-placeholder">No content in this slot.</div>
								{/if}
							</div>
						{/each}
					</div>
				</section>
			{/if}

			{#if breadcrumbs.length}
				<section class="editor-sidebar-section">
					<h3 class="editor-sidebar-section-title">Selection</h3>
					<div class="editor-breadcrumbs">
						{#each breadcrumbs as crumb}
							{#if crumb.isSlot}
								<span class="editor-breadcrumb editor-breadcrumb-slot">{crumb.label}</span>
							{:else}
								<button
									type="button"
									class={[
										"editor-breadcrumb",
										selection.path?.join("/") === crumb.path.join("/") && "editor-breadcrumb-active",
									]}
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
									value={activeProps[field.name]}
									onChange={(value) => updateProperty?.(selection.path, field.name, value)}
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
								value={activeProps[field.name]}
								onChange={(value) => updateProperty?.(selection.path, field.name, value)}
							/>
						{/each}
					</div>
				</section>
			{/if}
		</div>
	{:else}
		<div class="editor-sidebar-empty">
			<p>No editor schema is available for {formatComponentType(selection.component.type)}.</p>
		</div>
	{/if}
{/if}

<style>
	.editor-sidebar-section-stack,
	.editor-sidebar-fields {
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
		min-height: 6rem;
		text-align: center;
		color: rgba(15, 23, 42, 0.6);
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

	.editor-slot-group {
		display: grid;
		gap: 0.5rem;
	}

	.editor-slot-group-label {
		font-size: 0.78rem;
		font-weight: 600;
		color: rgba(15, 23, 42, 0.72);
		text-transform: capitalize;
	}

	.editor-slot-group-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.editor-slot-jump-button {
		border: 1px solid rgba(15, 23, 42, 0.12);
		border-radius: 999px;
		background: #fff;
		padding: 0.375rem 0.625rem;
		font: inherit;
		font-size: 0.76rem;
		cursor: pointer;
	}
</style>
