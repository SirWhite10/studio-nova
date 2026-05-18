<script lang="ts">
	import { Avatar as AvatarPrimitive } from "bits-ui";

	let {
		ref = $bindable(null),
		style = "",
		...restProps
	}: AvatarPrimitive.ImageProps = $props();
</script>

<AvatarPrimitive.Image
	bind:ref
	data-slot="avatar-image"
	style={`width: 100%; height: 100%; object-fit: cover; border-radius: inherit; ${style}`}
	{...restProps}
/>
