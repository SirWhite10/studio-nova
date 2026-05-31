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
	}: HTMLAttributes<HTMLTableRowElement> & {
		class?: string;
		children?: () => unknown;
	} = $props();
</script>

<View
	bind:ref
	as="tr"
	data-slot="table-row"
	class={className}
	borderBottom={`1px solid color-mix(in srgb, ${canvasTheme.colors.foreground} 10%, transparent)`}
	states={{
		hover: { background: `color-mix(in srgb, ${canvasTheme.colors.muted} 50%, transparent)` },
		selected: { background: canvasTheme.colors.muted },
	}}
	style={`transition: background-color 150ms ease; ${style}`}
	{...restProps}
>
	{@render children?.()}
</View>
