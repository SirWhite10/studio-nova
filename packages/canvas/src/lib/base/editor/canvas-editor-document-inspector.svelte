<script lang="ts">
	import EditorField from "./fields/EditorField.svelte";
	import type { EditorComponent } from "./types.js";

	let {
		documentConfig = {},
		documentEditorConfig = undefined,
		updateDocumentProperty = undefined,
	}: {
		documentConfig?: Record<string, any>;
		documentEditorConfig?: EditorComponent<any>;
		updateDocumentProperty?: (property: string, value: any) => void;
	} = $props();

	const editorGroups = $derived(documentEditorConfig?.editorConfig?.groups || {});
	const editorFields = $derived(documentEditorConfig?.editorConfig?.fields || {});
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
</script>

{#if documentEditorConfig}
	<div class="editor-sidebar-section-stack">
		{#if filteredGroups.length > 0}
			{#each filteredGroups as group}
				<section class="editor-sidebar-section">
					<h3 class="editor-sidebar-section-title">{group.config.label || group.name}</h3>
					<div class="editor-sidebar-fields">
						{#each group.fields as field}
							<EditorField
								name={field.name}
								config={field.config}
								value={documentConfig[field.name]}
								onChange={(value) => updateDocumentProperty?.(field.name, value)}
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
							value={documentConfig[field.name]}
							onChange={(value) => updateDocumentProperty?.(field.name, value)}
						/>
					{/each}
				</div>
			</section>
		{/if}
	</div>
{:else}
	<div class="editor-sidebar-placeholder">Document editor configuration is not available.</div>
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
		color: color-mix(in oklab, var(--foreground), transparent 12%);
	}

	.editor-sidebar-placeholder {
		display: grid;
		place-items: center;
		min-height: 12rem;
		text-align: center;
		color: color-mix(in oklab, var(--foreground), transparent 28%);
	}
</style>
