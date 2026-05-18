<script lang="ts">
import { cn } from "$lib/utils.js";
import * as Input from "$lib/components/view-ui/input/index.js";
import * as Label  from "$lib/components/view-ui/label/index.js";
import * as Button  from "$lib/base/button/index.js";
import Link from "@lucide/svelte/icons/link";
import type { SizeFieldConfig, SizeValue } from "../types.js";

let {
	name,
	config,
	value = {},
	onChange,
}: {
	name: string;
	config: SizeFieldConfig;
	value?: string | SizeValue;
	onChange?: (value: string | SizeValue) => void;
} = $props();

// Local state
let isLinked = $state(config.linked !== undefined ? config.linked : false);
let sizeValue = $state(parseSizeValue(value));

// Initialize local state
function parseSizeValue(value: string | SizeValue): SizeValue {
	if (typeof value === "string") {
		// Try to parse from string like "100px 200px" or similar
		const parts = value.split(/\s+/);
		if (parts.length >= 2) {
			return { width: parts[0], height: parts[1] };
		} else if (parts.length === 1) {
			return { width: parts[0], height: parts[0] };
		}
	} else if (value && typeof value === "object") {
		return { ...value };
	}

	return { width: "auto", height: "auto" };
}

// Format size value for output
function formatSizeValue(value: SizeValue): string | SizeValue {
	// For now, we'll just return the object
	return value;
}

// Handle value change for width or height
function handleSizeChange(dimension: "width" | "height", event: Event) {
	const target = event.target as HTMLInputElement;
	const newValue = target.value;

	const updatedValue = { ...sizeValue };
	updatedValue[dimension] = newValue;

	// If linked, update both dimensions
	if (isLinked) {
		updatedValue.width = newValue;
		updatedValue.height = newValue;
	}

	sizeValue = updatedValue;

	if (onChange) {
		onChange(formatSizeValue(updatedValue));
	}
}

// Toggle linked state
function toggleLinked() {
	isLinked = !isLinked;

	// If now linked, set both dimensions to width
	if (isLinked && sizeValue.width) {
		sizeValue = {
			width: sizeValue.width,
			height: sizeValue.width,
		};

		if (onChange) {
			onChange(formatSizeValue(sizeValue));
		}
	}
}
</script>

<div class="space-y-2">
  <div class="flex items-center justify-between">
    <Label.Root class="text-sm font-medium">
      {config.label}
      {#if config.required}
        <span class="text-destructive ml-1">*</span>
      {/if}
      {#if config.unit}
        <span class="text-muted-foreground ml-1">({config.unit})</span>
      {/if}
    </Label.Root>

    <Button.Root
      variant="ghost"
      size="icon"
      class="h-8 w-8"
      onclick={toggleLinked}
    >
      {#if isLinked}
        <Link class="h-4 w-4" />
      {:else}
        <Link class="text-muted-foreground h-4 w-4 opacity-50" />
      {/if}
    </Button.Root>
  </div>

  {#if config.description}
    <p class="text-muted-foreground text-xs">{config.description}</p>
  {/if}

  <div class="grid grid-cols-2 gap-2">
    <div class="space-y-1">
      <Label.Root for={`${name}-width`} class="text-xs">Width</Label.Root>
      <Input.Root
        id={`${name}-width`}
        type="text"
        value={sizeValue.width}
        oninput={(e) => handleSizeChange("width", e)}
      />
    </div>
    <div class="space-y-1">
      <Label.Root for={`${name}-height`} class="text-xs">Height</Label.Root>
      <Input.Root
        id={`${name}-height`}
        type="text"
        value={sizeValue.height}
        oninput={(e) => handleSizeChange("height", e)}
        disabled={isLinked}
      />
    </div>
  </div>
</div>
