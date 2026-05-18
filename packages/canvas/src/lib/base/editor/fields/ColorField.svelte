<script lang="ts">
import { cn } from "$lib/utils.js";
import * as Input from "$lib/components/view-ui/input/index.js";
import * as Label  from "$lib/components/view-ui/label/index.js";

import * as Button  from "$lib/base/button/index.js";
import * as Tabs from "$lib/components/view-ui/tabs/index.js";
import CheckCircle from "@lucide/svelte/icons/check-circle";
import type { ColorFieldConfig } from "../types.js";

let {
	name,
	config,
	value = "",
	onChange,
}: {
	name: string;
	config: ColorFieldConfig;
	value?: string;
	onChange?: (value: string) => void;
} = $props();

// Local state
let isOpen = $state(false);
let inputValue = $state(value);

// Color presets
const defaultPresets = [
	"#000000",
	"#ffffff",
	"#ff0000",
	"#00ff00",
	"#0000ff",
	"#ffff00",
	"#00ffff",
	"#ff00ff",
	"#c0c0c0",
	"#808080",
	"oklch(0.7 0.2 45)",
	"oklch(0.9 0.1 45)",
	"oklch(0.5 0.3 240)",
	"oklch(0.6 0.25 280)",
	"oklch(0.6 0.18 150)",
	"oklch(0.7 0.2 80)",
];

// Combine default presets with custom presets
const presets = $derived([...(config.presets || []), ...defaultPresets]);

// Handle value change
function handleChange(event: Event) {
	const target = event.target as HTMLInputElement;
	inputValue = target.value;

	if (onChange) {
		onChange(target.value);
	}
}

// Handle preset selection
function selectPreset(preset: string) {
	inputValue = preset;

	if (onChange) {
		onChange(preset);
	}

	isOpen = false;
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

  <div class="flex items-center gap-2">
    <div class="relative">
      <Button.Root
        variant="outline"
        size="icon"
        class="h-8 w-8 border-2"
        style={`background-color: ${value || "transparent"}`}
        onclick={() => (isOpen = !isOpen)}
      />

      {#if isOpen}
        <div
          class="bg-background absolute top-10 left-0 z-50 w-64 rounded-md border p-4 shadow-md"
        >
          <div class="space-y-2">
            <h4 class="font-medium">Color Picker</h4>

            {#if config.format === "oklch" || value?.includes("oklch")}
              <p class="text-muted-foreground text-xs">
                Using OKLCH color format for better color representation
              </p>
            {/if}

            <div class="grid grid-cols-5 gap-1 py-2">
              {#each presets as preset}
                <Button.Root
                  variant="outline"
                  size="icon"
                  class="relative h-6 w-6 rounded-md border"
                  style={`background-color: ${preset}`}
                  onclick={() => selectPreset(preset)}
                >
                  {#if inputValue === preset}
                    <CheckCircle class="text-background h-4 w-4" />
                  {/if}
                </Button.Root>
              {/each}
            </div>

            <Input.Root
              type="text"
              value={inputValue}
              oninput={handleChange}
              placeholder={config.format === "oklch"
                ? "oklch(0.7 0.2 45)"
                : config.format === "rgb"
                  ? "rgb(255, 0, 0)"
                  : "#ff0000"}
            />

            {#if config.format !== "oklch" && config.format !== "rgb" && config.format !== "hsl"}
              <div class="flex items-center gap-2 py-2">
                <input
                  type="color"
                  class="h-8 w-8 cursor-pointer rounded border"
                  value={value?.startsWith("#") ? value : "#000000"}
                  oninput={handleChange}
                />
                <span class="text-muted-foreground text-xs">
                  Color picker (only works with hex format)
                </span>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <Input.Root
      id={name}
      type="text"
      value={value || ""}
      oninput={handleChange}
      placeholder={config.format === "oklch"
        ? "oklch(0.7 0.2 45)"
        : config.format === "rgb"
          ? "rgb(255, 0, 0)"
          : "#ff0000"}
    />
  </div>
</div>
