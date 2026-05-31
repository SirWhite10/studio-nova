<script lang="ts">
	import AppWindowIcon from "@lucide/svelte/icons/app-window";
	import BoxIcon from "@lucide/svelte/icons/box";
	import EllipsisIcon from "@lucide/svelte/icons/ellipsis";
	import FilePenLineIcon from "@lucide/svelte/icons/file-pen-line";
	import ListTreeIcon from "@lucide/svelte/icons/list-tree";
	import { cn } from "$lib/utils.js";

	type MobileNavTab = "Add" | "Outline" | "Document" | "App";

	const tabs: Array<{ id: MobileNavTab; label: string; icon: typeof BoxIcon }> = [
		{ id: "Add", label: "Add", icon: BoxIcon },
		{ id: "Outline", label: "Outline", icon: ListTreeIcon },
		{ id: "Document", label: "Document", icon: FilePenLineIcon },
		{ id: "App", label: "App", icon: AppWindowIcon },
	];

	let {
		activeTab = undefined,
		showLabels = false,
		onSelect = undefined,
		onOpenMore = undefined,
	}: {
		activeTab?: MobileNavTab;
		showLabels?: boolean;
		onSelect?: (tab: MobileNavTab) => void;
		onOpenMore?: () => void;
	} = $props();
</script>

<nav class="canvas-editor-mobile-nav" aria-label="Mobile editor navigation">
	{#each tabs as tab}
		<button
			type="button"
			class={cn("canvas-editor-mobile-nav-button", activeTab === tab.id && "canvas-editor-mobile-nav-button-active", showLabels && "canvas-editor-mobile-nav-button-labeled")}
			onclick={() => onSelect?.(tab.id)}
			aria-label={tab.label}
			aria-pressed={activeTab === tab.id}
		>
			<tab.icon size={18} />
			{#if showLabels}
				<span>{tab.label}</span>
			{/if}
		</button>
	{/each}

	<button
		type="button"
		class={cn("canvas-editor-mobile-nav-button", showLabels && "canvas-editor-mobile-nav-button-labeled")}
		onclick={() => onOpenMore?.()}
		aria-label="More"
	>
		<EllipsisIcon size={18} />
		{#if showLabels}
			<span>More</span>
		{/if}
	</button>
</nav>

<style>
	.canvas-editor-mobile-nav {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 0.35rem;
		padding: 0.45rem;
		border: 1px solid var(--editor-border, var(--border));
		border-radius: 1.1rem;
		background: color-mix(in oklab, var(--editor-panel, var(--background)), transparent 4%);
		backdrop-filter: blur(14px);
		box-shadow: 0 10px 30px color-mix(in oklab, var(--foreground), transparent 90%);
	}

	.canvas-editor-mobile-nav-button {
		display: inline-flex;
		min-height: 3rem;
		min-width: 0;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		padding: 0.7rem 0.45rem;
		border: 1px solid transparent;
		border-radius: 0.95rem;
		background: transparent;
		color: var(--editor-fg-muted, color-mix(in oklab, var(--foreground), transparent 35%));
		font: inherit;
		font-size: 0.74rem;
		font-weight: 700;
		cursor: pointer;
		transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
	}

	.canvas-editor-mobile-nav-button-labeled {
		justify-content: flex-start;
		padding-inline: 0.8rem;
	}

	.canvas-editor-mobile-nav-button-active {
		border-color: color-mix(in oklab, var(--editor-accent, var(--primary)), transparent 70%);
		background: color-mix(in oklab, var(--editor-accent, var(--primary)), transparent 86%);
		color: var(--editor-accent-foreground, var(--primary));
	}
</style>
