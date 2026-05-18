<!-- @migration-task Error while migrating Svelte code: `$:` is not allowed in runes mode, use `$derived` or `$effect` instead
https://svelte.dev/e/legacy_reactive_statement_invalid -->
<script lang="ts">
import { cn } from "$lib/utils.js";
import * as Label  from "$lib/components/view-ui/label/index.js";
import * as Card  from "$lib/components/view-ui/card/index.js";
import * as Accordion  from "$lib/components/view-ui/accordion/index.js";

import ChevronDown from "@lucide/svelte/icons/chevron-down";
import EditorField from "./EditorField.svelte";
import type { ObjectFieldConfig } from "../types.js";

let {
	name,
	config,
	value = {},
	onChange,
}: {
	name: string;
	config: ObjectFieldConfig;
	value?: Record<string, any>;
	onChange?: (value: Record<string, any>) => void;
} = $props();

// Initialize value if not present
$effect(() => {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		value = config.default || {};
	}
});

// Get sorted field names
const fieldNames = $derived(Object.keys(config.fields).sort());

// Handle field value change
function handleFieldChange(fieldName: string, fieldValue: any) {
	const newValue = { ...value, [fieldName]: fieldValue };
	if (onChange) {
		onChange(newValue);
	}
}

// Check if field should be shown
function shouldShowField(fieldName: string) {
	const fieldConfig = config.fields[fieldName];

	if (typeof fieldConfig.showIf === "function") {
		return fieldConfig.showIf(value);
	}

	return true;
}
</script>

<div class="space-y-2">
  <Label.Root for={name} class="text-sm font-medium">
    {config.label}
    {#if config.required}
      <span class="text-destructive ml-1">*</span>
    {/if}
  </Label.Root>

  {#if config.description}
    <p class="text-muted-foreground text-xs">{config.description}</p>
  {/if}

  <Card.Root class="object-field space-y-4 p-3">
    {#each fieldNames as fieldName}
      {#if shouldShowField(fieldName)}
        <div class="object-field-item">
          <EditorField
            name={`${name}-${fieldName}`}
            config={config.fields[fieldName]}
            value={value[fieldName]}
            onChange={(newValue) => handleFieldChange(fieldName, newValue)}
          />
        </div>
      {/if}
    {/each}

    {#if fieldNames.length === 0}
      <div class="text-muted-foreground py-2 text-center text-sm">
        No fields defined for this object.
      </div>
    {/if}
  </Card.Root>
</div>

<style>
  .object-field {
    position: relative;
  }

  .object-field-item:not(:last-child) {
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border);
  }
</style>
