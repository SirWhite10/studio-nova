<script lang="ts">
	import { Command as CommandPrimitive } from "bits-ui";
	let { ref = $bindable(null), class: className = "", style = "", ...restProps }: CommandPrimitive.SeparatorProps = $props();
</script>
<CommandPrimitive.Separator bind:ref data-slot="command-separator" class={className} style={`height:1px; margin:0.25rem -0.25rem; background:var(--border); ${style}`} {...restProps} />
