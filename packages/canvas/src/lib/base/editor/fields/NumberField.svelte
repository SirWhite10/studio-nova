<script lang="ts">
import { cn } from "$lib/utils.js";
import * as Input from "$lib/components/view-ui/input/index.js";
import * as Label  from "$lib/components/view-ui/label/index.js";
import type { NumberFieldConfig } from "../types.js";

let {
	name,
	config,
	value,
	onChange,
}: {
	name: string;
	config: NumberFieldConfig;
	value?: number;
	onChange?: (value: number) => void;
} = $props();

// Local state
let inputValue = $state(value !== undefined ? value.toString() : "");

// Handle value change
function handleChange(event: Event) {
	const target = event.target as HTMLInputElement;
	inputValue = target.value;

	// Convert to number
	const numValue = parseFloat(target.value);

	// Validate number
	if (!isNaN(numValue)) {
		if (onChange) {
			onChange(numValue);
		}
	}
}

// Apply min/max constraints
function handleBlur() {
	if (inputValue === "") {
		return;
	}

	let numValue = parseFloat(inputValue);

	if (isNaN(numValue)) {
		inputValue = value !== undefined ? value.toString() : "";
		return;
	}

	if (config.min !== undefined && numValue < config.min) {
		numValue = config.min;
	}

	if (config.max !== undefined && numValue > config.max) {
		numValue = config.max;
	}

	inputValue = numValue.toString();

	if (onChange) {
		onChange(numValue);
	}
}
</script>

<div class="space-y-2">
  <Label.Root for={name} class="text-sm font-medium">
    {config.label}
    {#if config.required}
      <span class="text-destructive ml-1">*</span>
    {/if}
    {#if config.unit}
      <span class="text-muted-foreground ml-1">({config.unit})</span>
    {/if}
  </Label.Root>

  {#if config.description}
    <p class="text-muted-foreground text-xs">{config.description}</p>
  {/if}

  <div class="flex w-full items-center space-x-2">
    <Input.Root
      id={name}
      type="number"
      value={inputValue}
      min={config.min}
      max={config.max}
      step={config.step ?? 1}
      oninput={handleChange}
      onblur={handleBlur}
    />

    {#if config.unit}
      <div class="text-muted-foreground w-8 flex-none text-sm">
        {config.unit}
      </div>
    {/if}
  </div>
</div>
