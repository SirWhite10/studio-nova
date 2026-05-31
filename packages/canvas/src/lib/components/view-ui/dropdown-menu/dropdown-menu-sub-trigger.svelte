<script lang="ts">
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import Item from "./dropdown-menu-item.svelte";
	import type { ComponentProps } from "svelte";

	let { children, style = "", ...restProps }: ComponentProps<typeof Item> & { children?: () => any } = $props();
</script>

<Item data-slot="dropdown-menu-sub-trigger" style={`justify-content: space-between; ${style}`} {...restProps}>
	{@render children?.()}
	<ChevronRightIcon size={14} color={canvasTheme.colors.mutedForeground} />
</Item>
