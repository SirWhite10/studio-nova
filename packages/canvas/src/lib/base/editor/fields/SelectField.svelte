<script lang="ts">
import { cn } from "$lib/utils.js";
import Check from "@lucide/svelte/icons/check";
import X from "@lucide/svelte/icons/x";
import * as Label from "$lib/components/view-ui/label/index.js";
import * as Badge from "$lib/components/view-ui/badge/index.js"

import type { SelectFieldConfig, SelectOption } from "../types.js";

let {
	name,
	config,
	value,
	onChange,
}: {
	name: string;
	config: SelectFieldConfig;
	value?: string | number | (string | number)[];
	onChange?: (value: string | number | (string | number)[]) => void;
} = $props();

// Format options to proper structure
const options = $derived(formatOptions(config.options));

// Handle value change for single selection
function handleChange(newValue: string | number) {
	if (onChange) {
		// For numeric values, convert from string
		if (!isNaN(Number(newValue))) {
			newValue = Number(newValue);
		}
		onChange(newValue);
	}
}

// Handle multiple selection changes
function handleMultiChange(optionValue: string | number, isSelected: boolean) {
	if (!onChange) return;

	// Initialize as array if not already
	let currentValues = Array.isArray(value) ? [...value] : [];

	// Convert to number if numeric
	const typedValue = !isNaN(Number(optionValue))
		? Number(optionValue)
		: optionValue;

	if (isSelected) {
		// Add to selection if not already present
		if (!currentValues.includes(typedValue)) {
			currentValues.push(typedValue);
		}
	} else {
		// Remove from selection
		currentValues = currentValues.filter((v) => v !== typedValue);
	}

	onChange(currentValues);
}

// Check if an option is selected in multiple mode
function isOptionSelected(optionValue: string | number): boolean {
	if (!Array.isArray(value)) return false;

	// Handle numeric values properly
	const typedValue = !isNaN(Number(optionValue))
		? Number(optionValue)
		: optionValue;
	return value.includes(typedValue);
}

// Remove item from multiple selection
function removeItem(optionValue: string | number) {
	handleMultiChange(optionValue, false);
}

// Format options to consistent structure
function formatOptions(options: SelectOption[] | string[]): SelectOption[] {
	if (!options || !options.length) return [];

	return options.map((option) => {
		if (typeof option === "string") {
			return {
				value: option,
				label: formatOptionLabel(option),
			};
		}
		return option;
	});
}

// Format option label for display
function formatOptionLabel(value: string): string {
	return value
		.replace(/([A-Z])/g, " $1") // Add space before capital letters
		.replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
		.trim();
}

// Get selected option labels for display
function getSelectedLabels(): { value: string | number; label: string }[] {
	if (!Array.isArray(value) || !value.length) return [];

	return value.map((val) => {
		const option = options.find((opt) => opt.value === val);
		return {
			value: val,
			label: option ? option.label : val.toString(),
		};
	});
}

// Get selected label for single selection
function getSelectedLabel(): string {
	if (Array.isArray(value) || value === undefined) return "";

	const option = options.find((opt) => opt.value === value);
	return option ? option.label : value?.toString() || "";
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

  {#if config.multiple}
    <!-- Multiple selection UI -->
    <div class="space-y-2">
      <!-- Selected items display -->
      {#if Array.isArray(value) && value.length > 0}
        <div class="mb-2 flex flex-wrap gap-1">
          {#each getSelectedLabels() as item}
            <Badge.Badge variant="secondary" class="gap-1">
              {item.label}
              <button
                class="hover:bg-muted ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full"
                onclick={() => removeItem(item.value)}
              >
                <X class="h-3 w-3" />
              </button>
            </Badge.Badge>
          {/each}
        </div>
      {/if}

      <!-- Options list -->
      <div class="overflow-hidden rounded-md border" role="listbox">
        {#each options as option}
          <div
            class={cn(
              "hover:bg-muted/50 flex cursor-pointer items-center border-b px-3 py-2 last:border-0",
              isOptionSelected(option.value) && "bg-muted/80"
            )}
            role="option"
            aria-selected={isOptionSelected(option.value)}
            tabindex="0"
            onclick={() =>
              handleMultiChange(option.value, !isOptionSelected(option.value))}
            onkeydown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleMultiChange(
                  option.value,
                  !isOptionSelected(option.value)
                );
              }
            }}
          >
            <div class="flex-1">
              <div class="flex items-center gap-2">
                {#if option.icon}
                  <div class="text-muted-foreground h-4 w-4">{option.icon}</div>
                {/if}
                <span>{option.label}</span>
              </div>

              {#if option.description}
                <div class="text-muted-foreground mt-1 text-xs">
                  {option.description}
                </div>
              {/if}
            </div>

            <div class="flex h-5 w-5 items-center justify-center">
              {#if isOptionSelected(option.value)}
                <Check class="text-primary h-4 w-4" />
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <!-- Single selection UI -->
    <div class="rounded-md border">
      <select
        id={name}
        class="bg-background w-full border-0 p-2 focus:ring-0"
        value={value?.toString()}
        onchange={(e) => handleChange((e.target as HTMLSelectElement).value)}
      >
        <option value="" disabled selected={!value}>Select an option</option>
        {#each options as option}
          <option
            value={option.value.toString()}
            selected={value === option.value}
          >
            {option.label}
          </option>
        {/each}
      </select>
    </div>
  {/if}
</div>
