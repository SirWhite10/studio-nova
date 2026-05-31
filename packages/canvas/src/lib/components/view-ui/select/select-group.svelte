<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { HTMLAttributes } from "svelte/elements";

	let { ref = $bindable(null), class: className = "", children, style = "", ...restProps }: HTMLAttributes<HTMLDivElement> & { children?: () => any } = $props();
</script>

<View bind:ref data-slot="select-group" class={className} display="grid" gap={1} style={style} {...restProps}>{@render children?.()}</View>
