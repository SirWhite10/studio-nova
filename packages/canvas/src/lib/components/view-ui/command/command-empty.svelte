<script lang="ts">
	import { Command as CommandPrimitive } from "bits-ui";
	let { ref = $bindable(null), class: className = "", style = "", ...restProps }: CommandPrimitive.EmptyProps = $props();
</script>
<CommandPrimitive.Empty bind:ref data-slot="command-empty" class={className} style={`padding:1.5rem 0; text-align:center; font-size:0.875rem; ${style}`} {...restProps} />
