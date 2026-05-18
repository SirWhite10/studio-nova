<script lang="ts">
import Link from "@lucide/svelte/icons/link";
import * as Button from "$lib/base/button/index.js";
import * as Input from "$lib/components/view-ui/input/index.js";
import * as Label from "$lib/components/view-ui/label/index.js";
import * as Switch from "$lib/components/view-ui/switch/index.js";
import { cn } from "$lib/utils.js";
import type { SpacingFieldConfig, SpacingValue } from "../types.js";

let {
	name,
	config,
	value = {},
	onChange,
}: {
	name: string;
	config: SpacingFieldConfig;
	value?: string | SpacingValue;
	onChange?: (value: string | SpacingValue) => void;
} = $props();

// Local state
let isLinked = $state(config.linked !== undefined ? config.linked : true);
let spacingValue = $state(parseSpacingValue(value));

// Initialize local state
function parseSpacingValue(value: string | SpacingValue): SpacingValue {
	if (typeof value === "string") {
		const parts = value.trim().split(/\s+/);

		if (parts.length === 1) {
			return {
				top: parts[0],
				right: parts[0],
				bottom: parts[0],
				left: parts[0],
			};
		}
		if (parts.length === 2) {
			return {
				top: parts[0],
				right: parts[1],
				bottom: parts[0],
				left: parts[1],
			};
		}
		if (parts.length === 3) {
			return {
				top: parts[0],
				right: parts[1],
				bottom: parts[2],
				left: parts[1],
			};
		}
		if (parts.length === 4) {
			return {
				top: parts[0],
				right: parts[1],
				bottom: parts[2],
				left: parts[3],
			};
		}
	} else if (value && typeof value === "object") {
		return { ...value };
	}

	return { top: "0", right: "0", bottom: "0", left: "0" };
}

// Format spacing value to CSS-compatible string
function formatSpacingValue(value: SpacingValue): string {
	if (
		value.top === value.right &&
		value.right === value.bottom &&
		value.bottom === value.left &&
		value.top !== undefined
	) {
		// All sides are the same
		return value.top.toString();
	}
	if (
		value.top === value.bottom &&
		value.right === value.left &&
		value.top !== undefined &&
		value.right !== undefined
	) {
		// Top/bottom and left/right pairs are the same
		return `${value.top} ${value.right}`;
	}
	if (
		value.left === value.right &&
		value.top !== undefined &&
		value.right !== undefined &&
		value.bottom !== undefined
	) {
		// Left and right are the same
		return `${value.top} ${value.right} ${value.bottom}`;
	}
	// All four sides specified
	return `${value.top || "0"} ${value.right || "0"} ${value.bottom || "0"} ${value.left || "0"}`;
}

// Handle value change for a single direction
function handleDirectionChange(direction: keyof SpacingValue, event: Event) {
	const target = event.target as HTMLInputElement;
	const newValue = target.value;

	const updatedValue = { ...spacingValue };
	updatedValue[direction] = newValue;

	// If linked, update all directions
	if (isLinked) {
		updatedValue.top = newValue;
		updatedValue.right = newValue;
		updatedValue.bottom = newValue;
		updatedValue.left = newValue;
	}

	spacingValue = updatedValue;

	if (onChange) {
		onChange(formatSpacingValue(updatedValue));
	}
}

// Toggle linked state
function toggleLinked() {
	isLinked = !isLinked;

	// If now linked, set all values to the top value
	if (isLinked && spacingValue.top) {
		spacingValue = {
			top: spacingValue.top,
			right: spacingValue.top,
			bottom: spacingValue.top,
			left: spacingValue.top,
		};

		if (onChange) {
			onChange(formatSpacingValue(spacingValue));
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
      <Label.Root for={`${name}-top`} class="text-xs">Top</Label.Root>
      <Input.Root
        id={`${name}-top`}
        type="text"
        value={spacingValue.top}
        oninput={(e) => handleDirectionChange("top", e)}
      />
    </div>
    <div class="space-y-1">
      <Label.Root for={`${name}-right`} class="text-xs">Right</Label.Root>
      <Input.Root
        id={`${name}-right`}
        type="text"
        value={spacingValue.right}
        oninput={(e) => handleDirectionChange("right", e)}
        disabled={isLinked}
      />
    </div>
    <div class="space-y-1">
      <Label.Root for={`${name}-bottom`} class="text-xs">Bottom</Label.Root>
      <Input.Root
        id={`${name}-bottom`}
        type="text"
        value={spacingValue.bottom}
        oninput={(e) => handleDirectionChange("bottom", e)}
        disabled={isLinked}
      />
    </div>
    <div class="space-y-1">
      <Label.Root for={`${name}-left`} class="text-xs">Left</Label.Root>
      <Input.Root
        id={`${name}-left`}
        type="text"
        value={spacingValue.left}
        oninput={(e) => handleDirectionChange("left", e)}
        disabled={isLinked}
      />
    </div>
  </div>
</div>
