<script lang="ts">
	import EditorField from "./fields/EditorField.svelte";
	import type { EditorComponent } from "./types.js";

	let {
		appConfig = {},
		appEditorConfig = undefined,
		updateAppProperty = undefined,
	}: {
		appConfig?: Record<string, any>;
		appEditorConfig?: EditorComponent<any>;
		updateAppProperty?: (property: string, value: any) => void;
	} = $props();

	const editorGroups = $derived(appEditorConfig?.editorConfig?.groups || {});
	const editorFields = $derived(appEditorConfig?.editorConfig?.fields || {});
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
				return !Object.values(editorGroups).some((group) => group.fields?.includes(key));
			})
			.map(([key, field]) => ({
				name: key,
				config: field,
			})),
	);
</script>

{#if appEditorConfig}
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
								value={appConfig[field.name]}
								onChange={(value) => updateAppProperty?.(field.name, value)}
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
							value={appConfig[field.name]}
							onChange={(value) => updateAppProperty?.(field.name, value)}
						/>
					{/each}
				</div>
			</section>
		{/if}
	</div>
{:else}
	<div class="editor-sidebar-placeholder">App editor configuration is not available.</div>
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

	.editor-sidebar-placeholder {
		display: grid;
		place-items: center;
		min-height: 12rem;
		text-align: center;
		color: rgba(15, 23, 42, 0.6);
	}
</style>
