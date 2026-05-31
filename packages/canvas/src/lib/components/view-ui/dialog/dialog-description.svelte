<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	let { ref = $bindable(null), class: className = "", style = "", ...restProps }: DialogPrimitive.DescriptionProps = $props();
</script>
<DialogPrimitive.Description bind:ref data-slot="dialog-description" class={className} style={`color: var(--muted-foreground); font-size: 0.875rem; ${style}`} {...restProps} />
