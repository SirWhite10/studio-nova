<script lang="ts">
	import Content from "./dropdown-menu-content.svelte";
	import type { ComponentProps } from "svelte";

	let { style = "", ...restProps }: ComponentProps<typeof Content> = $props();
</script>

<Content data-slot="dropdown-menu-sub-content" sideOffset={8} style={`animation: view-ui-menu-in 150ms ease-out; ${style}`} {...restProps} />
