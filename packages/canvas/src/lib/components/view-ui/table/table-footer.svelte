<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className = "",
		style = "",
		children,
		...restProps
	}: HTMLAttributes<HTMLTableSectionElement> & {
		class?: string;
		children?: () => unknown;
	} = $props();
</script>

<View
	bind:ref
	as="tfoot"
	data-slot="table-footer"
	class={className}
	background="color-mix(in srgb, oklch(0.97 0 0) 50%, transparent)"
	borderTop={`1px solid color-mix(in srgb, ${canvasTheme.colors.foreground} 10%, transparent)`}
	style={`font-weight: 500; ${style}`}
	{...restProps}
>
	{@render children?.()}
</View>
