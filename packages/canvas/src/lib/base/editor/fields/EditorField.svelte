<svelte:options runes={true} />

<script lang="ts">
import RecursiveEditorField from "./EditorField.svelte";
import type { EditorFieldProps, EditorFieldConfig } from "../types.js";
import { cn } from "$lib/utils.js";

// Props definition
let {
	name,
	config = {
		type: "text",
		label: "",
		required: false,
	},
	value,
	onChange,
	class: className = "",
}: EditorFieldProps = $props();

// Handle value change
function handleChange(newValue: any) {
	if (onChange) {
		onChange(newValue);
	}
}

function normalizeOptions(fieldConfig: EditorFieldConfig) {
	if (fieldConfig.type !== "select") {
		return [];
	}

	return fieldConfig.options.map((option) =>
		typeof option === "string" ? { value: option, label: option } : option,
	);
}

function handleInput(event: Event) {
	const target = event.currentTarget as
		| HTMLInputElement
		| HTMLTextAreaElement
		| HTMLSelectElement;

	switch (config.type) {
		case "number":
			handleChange(target.value === "" ? undefined : Number(target.value));
			break;
		case "boolean":
			handleChange((target as HTMLInputElement).checked);
			break;
		default:
			handleChange(target.value);
	}
}

function handleObjectChange(fieldName: string, nextValue: unknown) {
	handleChange({
		...(value && typeof value === "object" ? value : {}),
		[fieldName]: nextValue,
	});
}

function handleArrayItemChange(index: number, nextValue: unknown) {
	const currentValue = Array.isArray(value) ? [...value] : [];
	currentValue[index] = nextValue;
	handleChange(currentValue);
}

function addArrayItem() {
	const currentValue = Array.isArray(value) ? [...value] : [];
	const defaultValue =
		config.type === "array" ? config.itemConfig.default ?? "" : "";
	currentValue.push(defaultValue);
	handleChange(currentValue);
}

function removeArrayItem(index: number) {
	if (!Array.isArray(value)) {
		return;
	}

	const currentValue = [...value];
	currentValue.splice(index, 1);
	handleChange(currentValue);
}
</script>

<div class={cn("editor-field", className)}>
	<label class="editor-field-label" for={name}>
		{config.label}
		{#if config.required}
			<span class="editor-field-required">*</span>
		{/if}
	</label>

	{#if config.description}
		<p class="editor-field-description">{config.description}</p>
	{/if}

	{#if config.type === "text"}
		{#if config.multiline}
			<textarea
				id={name}
				class="editor-field-control editor-field-textarea"
				placeholder={config.placeholder}
				value={value ?? ""}
				oninput={handleInput}
			></textarea>
		{:else}
			<input
				id={name}
				class="editor-field-control"
				type={config.secret ? "password" : "text"}
				placeholder={config.placeholder}
				value={value ?? ""}
				oninput={handleInput}
			/>
		{/if}
	{:else if config.type === "number"}
		<input
			id={name}
			class="editor-field-control"
			type="number"
			min={config.min}
			max={config.max}
			step={config.step}
			value={value ?? ""}
			oninput={handleInput}
		/>
	{:else if config.type === "boolean"}
		<label class="editor-field-checkbox">
			<input
				id={name}
				type="checkbox"
				checked={Boolean(value)}
				onchange={handleInput}
			/>
			<span>{Boolean(value) ? "Enabled" : "Disabled"}</span>
		</label>
	{:else if config.type === "select"}
		<select
			id={name}
			class="editor-field-control"
			value={value?.toString() ?? ""}
			onchange={handleInput}
		>
			<option value="">Select an option</option>
			{#each normalizeOptions(config) as option}
				<option value={option.value.toString()}>{option.label}</option>
			{/each}
		</select>
	{:else if config.type === "object"}
		<div class="editor-field-object">
			{#each Object.entries(config.fields) as [fieldName, fieldConfig]}
				<RecursiveEditorField
					name={`${name}-${fieldName}`}
					config={fieldConfig}
					value={value?.[fieldName]}
					onChange={(nextValue: unknown) => handleObjectChange(fieldName, nextValue)}
				/>
			{/each}
		</div>
	{:else if config.type === "array"}
		<div class="editor-field-array">
			{#each Array.isArray(value) ? value : [] as item, index}
				<div class="editor-field-array-item">
					<RecursiveEditorField
						name={`${name}-${index}`}
						config={config.itemConfig}
						value={item}
						onChange={(nextValue: unknown) => handleArrayItemChange(index, nextValue)}
					/>
					<button
						class="editor-field-array-remove"
						type="button"
						onclick={() => removeArrayItem(index)}
					>
						Remove
					</button>
				</div>
			{/each}
			<button class="editor-field-array-add" type="button" onclick={addArrayItem}>
				Add item
			</button>
		</div>
	{:else}
		<input
			id={name}
			class="editor-field-control"
			type="text"
			value={value ?? ""}
			oninput={handleInput}
		/>
	{/if}
</div>

<style>
	.editor-field {
		display: grid;
		gap: 0.375rem;
	}

	.editor-field-label {
		font-size: 0.82rem;
		font-weight: 600;
	}

	.editor-field-required {
		color: #dc2626;
	}

	.editor-field-description {
		margin: 0;
		font-size: 0.75rem;
		color: color-mix(in oklab, var(--foreground), transparent 35%);
	}

	.editor-field-control,
	.editor-field-textarea,
	.editor-field select {
		width: 100%;
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		padding: 0.625rem 0.75rem;
		font: inherit;
		background: var(--background);
		color: var(--foreground);
		box-sizing: border-box;
	}

	.editor-field-textarea {
		min-height: 6rem;
		resize: vertical;
	}

	.editor-field-checkbox {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
	}

	.editor-field-object,
	.editor-field-array {
		display: grid;
		gap: 0.75rem;
		padding: 0.75rem;
		border: 1px solid var(--border);
		border-radius: 0.875rem;
		background: color-mix(in oklab, var(--background), var(--muted) 30%);
	}

	.editor-field-array-item {
		display: grid;
		gap: 0.5rem;
	}

	.editor-field-array-add,
	.editor-field-array-remove {
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: var(--background);
		color: var(--foreground);
		font: inherit;
		cursor: pointer;
	}

	.editor-field-array-remove {
		justify-self: start;
	}
</style>
