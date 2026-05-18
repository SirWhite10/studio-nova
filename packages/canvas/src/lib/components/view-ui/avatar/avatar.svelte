<script lang="ts">
	import { Avatar as AvatarPrimitive } from "bits-ui";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let {
		ref = $bindable(null),
		loadingStatus = $bindable("loading"),
		size = "default",
		style = "",
		...restProps
	}: AvatarPrimitive.RootProps & {
		size?: "default" | "sm" | "lg";
	} = $props();

	const sizeValue = $derived(size === "sm" ? "1.5rem" : size === "lg" ? "2.5rem" : "2rem");
</script>

<AvatarPrimitive.Root
	bind:ref
	bind:loadingStatus
	data-slot="avatar"
	data-size={size}
	style={`position: relative; display: inline-flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; width: ${sizeValue}; height: ${sizeValue}; border-radius: 0.75rem; background: ${canvasTheme.colors.muted}; color: ${canvasTheme.colors.mutedForeground}; ${style}`}
	{...restProps}
/>
