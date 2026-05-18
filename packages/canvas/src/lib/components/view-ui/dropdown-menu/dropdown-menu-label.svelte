<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		inset = false,
		children,
		style = "",
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		inset?: boolean;
		children?: () => any;
	} = $props();
</script>

<View
	as="div"
	bind:ref
	data-slot="dropdown-menu-label"
	color={canvasTheme.colors.mutedForeground}
	paddingTop="0.375rem"
	paddingBottom="0.375rem"
	paddingLeft={inset ? "2rem" : "0.5rem"}
	paddingRight="0.5rem"
	style={`font-size: 0.75rem; font-weight: 500; ${style}`}
	{...restProps}
>
	{@render children?.()}
</View>
