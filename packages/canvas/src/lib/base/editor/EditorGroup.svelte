<script lang="ts">
import { cn } from "$lib/utils.js";
import EditorField from "./fields/EditorField.svelte";

// Import types
import type { EditorGroupProps, EditorFieldConfig } from "./types.js";

// Props definition
let {
	name,
	config,
	fieldsConfig,
	values = {},
	onChange,
	class: className = "",
}: EditorGroupProps = $props();

// Fields defined in this group
const groupFields = $derived(
	config.fields
		?.map((fieldName) => ({
			name: fieldName,
			config: fieldsConfig[fieldName] as EditorFieldConfig,
		}))
		.filter((field) => field.config) || [],
);

// Handle property change
function handlePropertyChange(propertyName: string, value: any) {
	if (onChange) {
		onChange(propertyName, value);
	}
}
</script>

<section class={cn("editor-group", className)}>
	<h3 class="editor-group-title">{config.label || name}</h3>
	<div class="editor-group-fields">
		{#each groupFields as field}
			<EditorField
				name={field.name}
				config={field.config}
				value={values[field.name]}
				onChange={(value) => handlePropertyChange(field.name, value)}
			/>
		{/each}
	</div>
</section>

<style>
	.editor-group {
		display: grid;
		gap: 0.75rem;
		padding: 0.875rem;
		border: 1px solid rgba(15, 23, 42, 0.08);
		border-radius: 1rem;
		background: #fff;
	}

	.editor-group-title {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 700;
	}

	.editor-group-fields {
		display: grid;
		gap: 0.75rem;
	}
</style>
