<script lang="ts">
import * as Input from "$lib/components/view-ui/input/index.js"
import * as Label from "$lib/components/view-ui/label/index.js"
import * as Textarea from "$lib/components/view-ui/textarea/index.js"
import type { TextFieldConfig } from "../types.js";

let {
	name,
	config,
	value = "",
	onChange,
}: {
	name: string;
	config: TextFieldConfig;
	value?: string;
	onChange?: (value: string) => void;
} = $props();

// Handle value change
function handleChange(event: Event) {
	const target = event.target as HTMLInputElement | HTMLTextAreaElement;
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

  {#if config.multiline}
    <Textarea.Root
      id={name}
      value={value || ""}
      placeholder={config.placeholder}
      oninput={handleChange}
      rows={5}
    />
  {:else}
    <Input.Root
      id={name}
      type={config.secret ? "password" : "text"}
      value={value || ""}
      placeholder={config.placeholder}
      oninput={handleChange}
    />
  {/if}
</div>
