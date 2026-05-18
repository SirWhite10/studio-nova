<!-- @migration-task Error while migrating Svelte code: `$:` is not allowed in runes mode, use `$derived` or `$effect` instead
https://svelte.dev/e/legacy_reactive_statement_invalid -->
<script lang="ts">
import { cn } from "$lib/utils.js";
import * as Label  from "$lib/components/view-ui/label/index.js";
import * as Button  from "$lib/base/button/index.js";
import * as Card  from "$lib/components/view-ui/card/index.js";
import * as Separator  from "$lib/components/view-ui/separator/index.js";
import Plus from "@lucide/svelte/icons/plus";
import Trash2 from "@lucide/svelte/icons/trash-2";
import GripVertical from "@lucide/svelte/icons/grip-vertical";
import ChevronDown from "@lucide/svelte/icons/chevron-down";
import ChevronUp from "@lucide/svelte/icons/chevron-up";
import EditorField from "./EditorField.svelte";
import type { ArrayFieldConfig } from "../types.js";

let {
	name,
	config,
	value = [],
	onChange,
}: {
	name: string;
	config: ArrayFieldConfig;
	value?: any[];
	onChange?: (value: any[]) => void;
} = $props();

// Initialize value if not present
$effect(() => {
	if (!value || !Array.isArray(value)) {
		value = config.default || [];
	}
});

// Check if can add more items
const canAddItem = $derived(!config.maxItems || value.length < config.maxItems);

// Check if can remove items
const canRemoveItem = $derived(
	!config.minItems || value.length > config.minItems,
);

// Handle adding a new item
function addItem() {
	if (canAddItem) {
		const newValue = [...value, getDefaultItemValue()];
		if (onChange) {
			onChange(newValue);
		}
	}
}

// Get default value for new item
function getDefaultItemValue() {
	// For primitive types, return the default or empty value
	if (
		["text", "number", "boolean", "color", "icon"].includes(
			config.itemConfig.type,
		)
	) {
		return config.itemConfig.default || "";
	}

	// For object types, return a copy of the default or empty object
	if (config.itemConfig.type === "object") {
		return config.itemConfig.default ? { ...config.itemConfig.default } : {};
	}

	// For array types, return a copy of the default or empty array
	if (config.itemConfig.type === "array") {
		return config.itemConfig.default ? [...config.itemConfig.default] : [];
	}

	// For other complex types, return appropriate defaults
	if (config.itemConfig.type === "link") {
		return config.itemConfig.default
			? { ...config.itemConfig.default }
			: { url: "" };
	}

	if (config.itemConfig.type === "image") {
		return config.itemConfig.default
			? { ...config.itemConfig.default }
			: { src: "" };
	}

	if (config.itemConfig.type === "spacing") {
		return config.itemConfig.default ? { ...config.itemConfig.default } : {};
	}

	if (config.itemConfig.type === "size") {
		return config.itemConfig.default ? { ...config.itemConfig.default } : {};
	}

	// Default fallback
	return "";
}

// Handle removing an item
function removeItem(index: number) {
	if (canRemoveItem) {
		const newValue = [...value];
		newValue.splice(index, 1);
		if (onChange) {
			onChange(newValue);
		}
	}
}

// Handle moving an item up
function moveItemUp(index: number) {
	if (index > 0) {
		const newValue = [...value];
		const temp = newValue[index];
		newValue[index] = newValue[index - 1];
		newValue[index - 1] = temp;
		if (onChange) {
			onChange(newValue);
		}
	}
}

// Handle moving an item down
function moveItemDown(index: number) {
	if (index < value.length - 1) {
		const newValue = [...value];
		const temp = newValue[index];
		newValue[index] = newValue[index + 1];
		newValue[index + 1] = temp;
		if (onChange) {
			onChange(newValue);
		}
	}
}

// Handle item value change
function handleItemChange(index: number, newItemValue: any) {
	const newValue = [...value];
	newValue[index] = newItemValue;
	if (onChange) {
		onChange(newValue);
	}
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

  <div class="array-field space-y-3">
    {#if value.length === 0}
      <div
        class="text-muted-foreground rounded-md border border-dashed py-4 text-center"
      >
        No items. Click "Add Item" to add a new entry.
      </div>
    {:else}
      {#each value as item, index}
        <Card.Root class="overflow-hidden">
          <div class="bg-muted/30 flex items-center border-b p-2">
            <div class="flex flex-1 items-center gap-2">
              <GripVertical class="text-muted-foreground h-4 w-4" />
              <span class="text-sm font-medium">Item {index + 1}</span>
            </div>

            <div class="flex items-center gap-1">
              <Button.Root
                variant="ghost"
                size="icon"
                class="h-7 w-7"
                onclick={() => moveItemUp(index)}
                disabled={index === 0}
              >
                <ChevronUp class="h-4 w-4" />
              </Button.Root>

              <Button.Root
                variant="ghost"
                size="icon"
                class="h-7 w-7"
                onclick={() => moveItemDown(index)}
                disabled={index === value.length - 1}
              >
                <ChevronDown class="h-4 w-4" />
              </Button.Root>

              <Button.Root
                variant="ghost"
                size="icon"
                class="text-destructive hover:text-destructive h-7 w-7"
                onclick={() => removeItem(index)}
                disabled={!canRemoveItem}
              >
                <Trash2 class="h-4 w-4" />
              </Button.Root>
            </div>
          </div>

          <div class="p-3">
            <EditorField
              name={`${name}-${index}`}
              config={config.itemConfig}
              value={item}
              onChange={(newValue) => handleItemChange(index, newValue)}
            />
          </div>
        </Card.Root>
      {/each}
    {/if}

    <div class="flex justify-end">
      <Button.Root
        variant="outline"
        size="sm"
        class="flex items-center gap-1"
        onclick={addItem}
        disabled={!canAddItem}
      >
        <Plus class="h-4 w-4" />
        <span>Add Item</span>
      </Button.Root>
    </div>

    {#if config.maxItems && value.length >= config.maxItems}
      <p class="text-muted-foreground text-xs">
        Maximum number of items reached ({config.maxItems}).
      </p>
    {/if}
  </div>
</div>
