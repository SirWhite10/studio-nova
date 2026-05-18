<script lang="ts">
	import { Avatar as AvatarPrimitive } from "bits-ui";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let {
		ref = $bindable(null),
		style = "",
		...restProps
	}: AvatarPrimitive.FallbackProps = $props();
</script>

<AvatarPrimitive.Fallback
	bind:ref
	data-slot="avatar-fallback"
	style={`display: inline-flex; width: 100%; height: 100%; align-items: center; justify-content: center; border-radius: inherit; background: ${canvasTheme.colors.muted}; color: ${canvasTheme.colors.mutedForeground}; font-size: 0.75rem; font-weight: 600; ${style}`}
	{...restProps}
/>
