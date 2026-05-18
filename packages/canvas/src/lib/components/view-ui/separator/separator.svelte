<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let {
		ref = $bindable(null),
		orientation = "horizontal",
		decorative = true,
		style = "",
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		orientation?: "horizontal" | "vertical";
		decorative?: boolean;
	} = $props();
</script>

<View
	as="div"
	bind:ref
	data-slot="separator"
	role={decorative ? "none" : "separator"}
	aria-orientation={orientation}
	background={canvasTheme.colors.border}
	width={orientation === "horizontal" ? "100%" : "1px"}
	height={orientation === "horizontal" ? "1px" : "100%"}
	style={`flex-shrink: 0; ${style}`}
	{...restProps}
/>
