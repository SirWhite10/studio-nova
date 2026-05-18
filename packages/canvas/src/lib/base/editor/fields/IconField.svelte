<script lang="ts">
import * as Button from "$lib/base/button/index.js";
import * as Input from "$lib/components/view-ui/input/index.js";
import * as Label from "$lib/components/view-ui/label/index.js";

import type { IconFieldConfig } from "../types.js";

// Note: In a real implementation, you would integrate with an icon library
// such as Iconify or similar

let {
	name,
	config,
	value = "",
	onChange,
}: {
	name: string;
	config: IconFieldConfig;
	value?: string;
	onChange?: (value: string) => void;
} = $props();

// Local state
let isOpen = $state(false);

// Example icon options (would be more extensive in a real implementation)
const iconSets = [
	{ name: "Lucide", icons: ["user", "home", "settings", "mail", "bell"] },
	{ name: "Material", icons: ["add", "remove", "edit", "delete", "save"] },
	{
		name: "Feather",
		icons: ["activity", "alert-circle", "at-sign", "award", "camera"],
	},
];

// Handle icon selection
function selectIcon(icon: string) {
	if (onChange) {
		onChange(icon);
	}

	isOpen = false;
}

// Handle input change
function handleInputChange(event: Event) {
	const target = event.target as HTMLInputElement;
	if (onChange) {
		onChange(target.value);
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

  <div class="flex items-center gap-2">
    <Input.Input
      id={name}
      type="text"
      {value}
      oninput={handleInputChange}
      placeholder="icon-name"
    />

    <div class="relative">
      <Button.Root
        variant="outline"
        size="icon"
        onclick={() => (isOpen = !isOpen)}
      >
        <!-- Display current icon if available -->
        {#if value}
          <!-- Placeholder for actual icon rendering -->
          <span class="text-xs">{value}</span>
        {:else}
          <span class="text-xs">Icon</span>
        {/if}
      </Button.Root>

      {#if isOpen}
        <div
          class="bg-background absolute top-10 left-0 z-50 w-64 rounded-md border p-4 shadow-md"
        >
          <h4 class="mb-2 font-medium">Select Icon</h4>

          <div class="space-y-4">
            {#each iconSets as set}
              <div>
                <h5 class="text-muted-foreground mb-1 text-sm">{set.name}</h5>
                <div class="grid grid-cols-5 gap-1">
                  {#each set.icons as icon}
                    <Button.Root
                      variant={value === icon ? "default" : "ghost"}
                      size="icon"
                      onclick={() => selectIcon(icon)}
                      class="h-8 w-8"
                    >
                      <span class="text-xs">{icon}</span>
                    </Button.Root>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
