<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { View } from "$lib/base/view/index.js";
	let { ref = $bindable(null), class: className = "", ...restProps }: DialogPrimitive.OverlayProps = $props();
</script>
<DialogPrimitive.Overlay bind:ref {...restProps}>
	{#snippet child({ props })}
		<View {...props} data-slot="dialog-overlay" class={className} position="fixed" inset="0" zIndex={50} background="rgba(0,0,0,0.5)" style="animation: dialog-fade-in 150ms ease-out;" />
	{/snippet}
</DialogPrimitive.Overlay>
<style>@keyframes dialog-fade-in{from{opacity:0}to{opacity:1}}</style>
