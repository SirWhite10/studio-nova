<script lang="ts">
	import PanelLeftIcon from "@lucide/svelte/icons/panel-left";
	import { Button } from "$lib/components/view-ui/button/index.js";
	import type { ComponentProps } from "svelte";
	import { useSidebar } from "./context.svelte.js";

	let {
		ref = $bindable(null),
		onclick,
		children,
		...restProps
	}: ComponentProps<typeof Button> & {
		onclick?: (event: MouseEvent) => void;
		children?: () => any;
	} = $props();

	const sidebar = useSidebar();
</script>

<Button
	bind:ref
	data-sidebar="trigger"
	data-slot="sidebar-trigger"
	variant="ghost"
	size="icon-sm"
	type="button"
	onclick={(event) => {
		onclick?.(event);
		sidebar.toggle();
	}}
	{...restProps}
>
	{#if children}
		{@render children?.()}
	{:else}
		<PanelLeftIcon size={16} />
		<span class="sr-only">Toggle Sidebar</span>
	{/if}
</Button>
