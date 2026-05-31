<script lang="ts">
	import { Command as CommandPrimitive } from "bits-ui";
	let { ref = $bindable(null), class: className = "", style = "", ...restProps }: CommandPrimitive.ListProps = $props();
</script>
<CommandPrimitive.List bind:ref data-slot="command-list" class={className} style={`max-height:24rem; overflow:auto; ${style}`} {...restProps} />
