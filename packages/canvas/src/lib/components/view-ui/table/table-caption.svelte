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
	}: HTMLAttributes<HTMLTableCaptionElement> & {
		class?: string;
		children?: () => unknown;
	} = $props();
</script>

<View
	bind:ref
	as="caption"
	data-slot="table-caption"
	class={className}
	color={canvasTheme.colors.mutedForeground}
	style={`margin-top: 1rem; font-size: 0.875rem; ${style}`}
	{...restProps}
>
	{@render children?.()}
</View>
