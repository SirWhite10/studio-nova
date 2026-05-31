<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import { Command as CommandPrimitive } from "bits-ui";
	let { ref = $bindable(null), class: className = "", children, style = "", ...restProps }: CommandPrimitive.ItemProps & { children?: () => any } = $props();
</script>
<CommandPrimitive.Item bind:ref data-slot="command-item" class={className} style={`position:relative; display:flex; cursor:default; user-select:none; align-items:center; gap:0.5rem; border-radius:0.375rem; padding:0.5rem 0.75rem; font-size:0.875rem; outline:none; ${style}`} {...restProps}>
	{@render children?.()}
	<CheckIcon data-slot="command-item-indicator" size={16} style="margin-left:auto; opacity:0;" />
</CommandPrimitive.Item>
<style>
	:global([data-slot="command-item"][data-selected="true"]) { background: var(--editor-panel-elevated, var(--muted)); }
	:global([data-slot="command-item"][data-disabled="true"]) { pointer-events: none; opacity: .5; }
	:global([data-slot="command-item"] svg) { pointer-events: none; flex-shrink: 0; }
</style>
