<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	let { ref = $bindable(null), class: className = "", style = "", ...restProps }: DialogPrimitive.TitleProps = $props();
</script>
<DialogPrimitive.Title bind:ref data-slot="dialog-title" class={className} style={`font-weight: 600; letter-spacing: -0.025em; ${style}`} {...restProps} />
