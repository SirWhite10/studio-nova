<script lang="ts">
	import BoxIcon from "@lucide/svelte/icons/box";
	import CogIcon from "@lucide/svelte/icons/cog";
	import Layers3Icon from "@lucide/svelte/icons/layers-3";
	import ListTreeIcon from "@lucide/svelte/icons/list-tree";
	import SlidersHorizontalIcon from "@lucide/svelte/icons/sliders-horizontal";
	import { cn } from "$lib/utils.js";
	import CanvasEditorAppMenu from "./canvas-editor-app-menu.svelte";
	import type { EditorAppSection, EditorLeftPanel } from "./types.js";

	const items: Array<{ id: EditorLeftPanel; label: string; icon: typeof Layers3Icon }> = [
		{ id: "Components", label: "Components", icon: BoxIcon },
		{ id: "Outline", label: "Outline", icon: ListTreeIcon },
		{ id: "Fields", label: "Fields", icon: SlidersHorizontalIcon },
	];

	let {
		activePanel = "Outline",
		appName = "Canvas App",
		pluginTabs = [],
		onSelect,
		onSelectAppSection,
		onOpenPages,
		onOpenEditorSettings,
	}: {
		activePanel?: EditorLeftPanel;
		appName?: string;
		pluginTabs?: Array<{ id: string; label: string; icon?: typeof Layers3Icon; onSelect?: () => void }>;
		onSelect?: (panel: EditorLeftPanel) => void;
		onSelectAppSection?: (section: EditorAppSection) => void;
		onOpenPages?: () => void;
		onOpenEditorSettings?: () => void;
	} = $props();
</script>

<nav class="canvas-editor-nav-rail" aria-label="Editor panels">
	<CanvasEditorAppMenu {appName} onSelectSection={onSelectAppSection} {onOpenPages} />
	<div class="canvas-editor-nav-rail-group" role="list">
		{#each items as item}
			<button
				type="button"
				class={cn("canvas-editor-nav-rail-button", activePanel === item.id && "canvas-editor-nav-rail-button-active")}
				onclick={() => onSelect?.(item.id)}
				aria-label={item.label}
				title={item.label}
				aria-pressed={activePanel === item.id}
			>
				<item.icon size={17} />
				<span class="sr-only">{item.label}</span>
			</button>
		{/each}
	</div>

	{#if pluginTabs.length}
		<div class="canvas-editor-nav-rail-group canvas-editor-nav-rail-plugin-group" role="list" aria-label="Plugins">
			{#each pluginTabs as tab}
				<button type="button" class="canvas-editor-nav-rail-button" onclick={() => tab.onSelect?.()} aria-label={tab.label} title={tab.label}>
					{#if tab.icon}
						<tab.icon size={17} />
					{:else}
						<span class="canvas-editor-nav-rail-fallback-icon">{tab.label.slice(0, 1)}</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}

	<button type="button" class="canvas-editor-nav-rail-button canvas-editor-nav-rail-settings" onclick={() => onOpenEditorSettings?.()} aria-label="Editor Settings" title="Editor Settings">
		<CogIcon size={17} />
	</button>
</nav>

<style>
	.canvas-editor-nav-rail {
		display: flex;
		width: 3.5rem;
		height: 100%;
		min-height: 0;
		flex-direction: column;
		align-items: center;
		gap: 0.65rem;
		padding: 0.7rem 0.55rem;
		border-right: 1px solid var(--editor-border, var(--border));
		background: color-mix(in oklab, var(--editor-panel, var(--background)), var(--editor-bg, var(--muted)) 32%);
		color: var(--editor-fg, var(--foreground));
	}

	.canvas-editor-nav-rail-group {
		display: grid;
		gap: 0.45rem;
	}

	.canvas-editor-nav-rail-plugin-group {
		padding-top: 0.65rem;
		border-top: 1px solid var(--editor-border, var(--border));
	}

	.canvas-editor-nav-rail-settings {
		margin-top: auto;
	}

	.canvas-editor-nav-rail-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.35rem;
		height: 2.35rem;
		border: 1px solid transparent;
		border-radius: 0.8rem;
		background: transparent;
		color: color-mix(in oklab, var(--editor-fg, var(--foreground)), transparent 20%);
		font: inherit;
		cursor: pointer;
		transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease, transform 140ms ease;
	}

	.canvas-editor-nav-rail-button:hover {
		border-color: var(--editor-border, var(--border));
		background: var(--editor-panel-elevated, var(--background));
		color: var(--editor-fg, var(--foreground));
	}

	.canvas-editor-nav-rail-button:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}

	.canvas-editor-nav-rail-button-active {
		border-color: color-mix(in oklab, var(--primary), transparent 72%);
		background: color-mix(in oklab, var(--primary), transparent 88%);
		color: var(--primary);
		box-shadow: inset 3px 0 0 var(--primary);
	}

	.canvas-editor-nav-rail-fallback-icon {
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
	}
</style>
