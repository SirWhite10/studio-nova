<script lang="ts">
	import { Command as CommandPrimitive, useId } from "bits-ui";
	let { ref = $bindable(null), class: className = "", children, heading, value, style = "", ...restProps }: CommandPrimitive.GroupProps & { heading?: string; children?: () => any } = $props();
</script>
<CommandPrimitive.Group bind:ref data-slot="command-group" class={className} value={value ?? heading ?? `----${useId()}`} style={`overflow:hidden; padding:0.25rem; ${style}`} {...restProps}>
	{#if heading}<CommandPrimitive.GroupHeading style="padding:0.375rem 0.5rem; font-size:0.75rem; font-weight:500; color:var(--muted-foreground);">{heading}</CommandPrimitive.GroupHeading>{/if}
	<CommandPrimitive.GroupItems {children} />
</CommandPrimitive.Group>
