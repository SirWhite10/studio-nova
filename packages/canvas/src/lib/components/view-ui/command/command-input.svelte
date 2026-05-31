<script lang="ts">
	import SearchIcon from "@lucide/svelte/icons/search";
	import { Command as CommandPrimitive } from "bits-ui";
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	let { ref = $bindable(null), class: className = "", ...restProps }: CommandPrimitive.InputProps = $props();
</script>
<View data-slot="command-input-wrapper" display="flex" alignItems="center" gap="0.5rem" borderBottom={`1px solid ${canvasTheme.colors.border}`} padding="0 0.75rem">
	<SearchIcon size={16} />
	<CommandPrimitive.Input bind:ref data-slot="command-input" class={className} style="height:2.75rem; width:100%; border:0; background:transparent; outline:none; color:inherit; font-size:0.875rem;" {...restProps} />
</View>
