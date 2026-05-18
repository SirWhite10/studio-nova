<script lang="ts">
	import type { HTMLImgAttributes } from "svelte/elements";

	let {
		class: className = "",
		src,
		alt = "",
		width,
		height,
		loading,
		decoding,
		style = "",
		...restProps
	}: HTMLImgAttributes & {
		class?: string;
	} = $props();
</script>

<img
	data-slot="image"
	class={className}
	{src}
	{alt}
	{width}
	{height}
	{loading}
	{decoding}
	{style}
	{...restProps}
/>
