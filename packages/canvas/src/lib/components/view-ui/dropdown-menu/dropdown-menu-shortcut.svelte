<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { HTMLAttributes } from "svelte/elements";

	let { ref = $bindable(null), class: className = "", children, style = "", ...restProps }: HTMLAttributes<HTMLDivElement> & { children?: () => any } = $props();
</script>

<View bind:ref as="span" data-slot="dropdown-menu-shortcut" class={className} marginLeft="auto" color={canvasTheme.colors.mutedForeground} style={`font-size: 0.75rem; letter-spacing: 0.08em; ${style}`} {...restProps}>{@render children?.()}</View>
