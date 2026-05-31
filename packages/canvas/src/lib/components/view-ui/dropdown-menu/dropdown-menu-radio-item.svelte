<script lang="ts">
	import CircleIcon from "@lucide/svelte/icons/circle";
	import Item from "./dropdown-menu-item.svelte";
	import type { ComponentProps } from "svelte";

	let { checked = false, children, style = "", ...restProps }: ComponentProps<typeof Item> & { checked?: boolean; children?: () => any } = $props();
</script>

<Item data-slot="dropdown-menu-radio-item" role="menuitemradio" aria-checked={checked} style={`position: relative; padding-left: 2rem; ${style}`} {...restProps}>
	<span style="position: absolute; left: 0.625rem; display: inline-flex; align-items: center; justify-content: center; width: 0.75rem; height: 0.75rem;">{#if checked}<CircleIcon size={8} fill="currentColor" />{/if}</span>
	{@render children?.()}
</Item>
