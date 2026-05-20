<script lang="ts">
	import CogIcon from "@lucide/svelte/icons/cog";
	import Layers3Icon from "@lucide/svelte/icons/layers-3";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import { cn } from "$lib/utils.js";
	import CanvasEditorAppMenu from "./canvas-editor-app-menu.svelte";
	import type { EditorAppSection, EditorLeftPanel } from "./types.js";

	const items: Array<{ id: EditorLeftPanel; label: string; icon: typeof Layers3Icon }> = [
		{ id: "Outline", label: "Outline", icon: Layers3Icon },
		{ id: "Components", label: "Components", icon: PlusIcon },
	];

	let {
		activePanel = "Outline",
		appName = "Canvas App",
		onSelect,
		onSelectAppSection,
		onOpenPages,
		onOpenEditorSettings,
	}: {
		activePanel?: EditorLeftPanel;
		appName?: string;
		onSelect?: (panel: EditorLeftPanel) => void;
		onSelectAppSection?: (section: EditorAppSection) => void;
		onOpenPages?: () => void;
		onOpenEditorSettings?: () => void;
	} = $props();
</script>

<div class="canvas-editor-left-rail">
	<CanvasEditorAppMenu {appName} onSelectSection={onSelectAppSection} {onOpenPages} />
	{#each items as item, index}
		<button
			type="button"
			class={cn(
				"canvas-editor-left-rail-button",
				activePanel === item.id && "canvas-editor-left-rail-button-active",
			)}
			onclick={() => onSelect?.(item.id)}
			aria-label={item.label}
			title={item.label}
			aria-pressed={activePanel === item.id}
		>
			<item.icon size={16} />
		</button>
	{/each}
	<button
		type="button"
		class="canvas-editor-left-rail-button mt-auto"
		onclick={() => onOpenEditorSettings?.()}
		aria-label="Editor Settings"
		title="Editor Settings"
	>
		<CogIcon size={16} />
	</button>
</div>

<style>
	.canvas-editor-left-rail {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		height: 100%;
		padding: 0.75rem;
		border-right: 1px solid var(--border);
	}

	.canvas-editor-left-rail-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		background: var(--background);
		color: var(--foreground);
		cursor: pointer;
	}

	.canvas-editor-left-rail-button-active {
		background: var(--foreground);
		color: var(--background);
		border-color: var(--foreground);
	}
</style>
