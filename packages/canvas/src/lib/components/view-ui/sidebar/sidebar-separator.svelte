<script lang="ts">
	import { Separator } from "$lib/components/view-ui/separator/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { ComponentProps } from "svelte";

	let { ref = $bindable(null), style = "", ...restProps }: ComponentProps<typeof Separator> = $props();
</script>

<Separator
	bind:ref
	data-slot="sidebar-separator"
	data-sidebar="separator"
	background={`color-mix(in srgb, ${canvasTheme.colors.foreground} 10%, transparent)`}
	style={`margin-inline: 0.5rem; width: auto; ${style}`}
	{...restProps}
/>
