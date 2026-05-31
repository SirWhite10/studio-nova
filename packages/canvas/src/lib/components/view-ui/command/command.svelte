<script lang="ts">
	import { Command as CommandPrimitive } from "bits-ui";
	let { ref = $bindable(null), class: className = "", style = "", ...restProps }: CommandPrimitive.RootProps = $props();
</script>
<CommandPrimitive.Root bind:ref data-slot="command" class={className} style={`display:flex; flex-direction:column; overflow:hidden; border-radius:0.5rem; background:transparent; color:inherit; ${style}`} {...restProps} />
