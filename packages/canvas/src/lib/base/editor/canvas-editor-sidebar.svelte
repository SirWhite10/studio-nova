<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";

	let {
		open = false,
		class: className = "",
		children,
	}: {
		open?: boolean;
		class?: string;
		children?: Snippet;
	} = $props();
</script>

{#if open}
	<aside
		class={cn(
			"canvas-editor-sidebar absolute inset-y-0 right-0 z-10 w-full max-w-sm border-l border-black/10 bg-white shadow-2xl shadow-black/10",
			className,
		)}
		aria-label="Canvas editor sidebar"
	>
		{#if children}
			{@render children()}
		{/if}
	</aside>
{/if}
