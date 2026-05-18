<script lang="ts">
import * as Checkbox from "$lib/components/view-ui/checkbox/index.js";
import * as Label from "$lib/components/view-ui/label/index.js";
import * as Switch from "$lib/components/view-ui/switch/index.js";

import type { BooleanFieldConfig } from "../types.js";

let {
	name,
	config,
	value = false,
	onChange,
	useSwitch = true,
}: {
	name: string;
	config: BooleanFieldConfig;
	value?: boolean;
	onChange?: (value: boolean) => void;
	useSwitch?: boolean;
} = $props();

// Handle value change
function handleChange(checked: boolean) {
	if (onChange) {
		onChange(checked);
	}
}
</script>

<div class="space-y-2">
  <div class="flex items-center justify-between">
    <div>
      <Label.Root for={name} class="text-sm font-medium">
        {config.label}
        {#if config.required}
          <span class="text-destructive ml-1">*</span>
        {/if}
      </Label.Root>

      {#if config.description}
        <p class="text-muted-foreground text-xs">{config.description}</p>
      {/if}
    </div>

    {#if useSwitch}
      <Switch.Switch id={name} checked={value} onCheckedChange={handleChange} />
    {:else}
      <Checkbox.Checkbox
        id={name}
        checked={value}
        onCheckedChange={handleChange}
      />
    {/if}
  </div>
</div>
