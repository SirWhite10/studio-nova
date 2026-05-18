<script lang="ts">
	import CogIcon from "@lucide/svelte/icons/cog";
	import Layers3Icon from "@lucide/svelte/icons/layers-3";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import { cn } from "$lib/utils.js";
	import type { EditorLeftPanel } from "./types.js";

	const items: Array<{ id: EditorLeftPanel; label: string; icon: typeof Layers3Icon }> = [
		{ id: "Outline", label: "Outline", icon: Layers3Icon },
		{ id: "Components", label: "Components", icon: PlusIcon },
		{ id: "Settings", label: "Settings", icon: CogIcon },
	];

	let {
		activePanel = "Outline",
		onSelect,
	}: {
		activePanel?: EditorLeftPanel;
		onSelect?: (panel: EditorLeftPanel) => void;
	} = $props();
</script>

<div class="canvas-editor-left-rail">
	{#each items as item, index}
		<button
			type="button"
			class={cn(
				"canvas-editor-left-rail-button",
				activePanel === item.id && "canvas-editor-left-rail-button-active",
				index === items.length - 1 && "mt-auto",
			)}
			onclick={() => onSelect?.(item.id)}
			aria-label={item.label}
			title={item.label}
			aria-pressed={activePanel === item.id}
		>
			<item.icon size={16} />
		</button>
	{/each}
</div>

<style>
	.canvas-editor-left-rail {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		height: 100%;
		padding: 0.75rem;
		border-right: 1px solid rgba(15, 23, 42, 0.08);
	}

	.canvas-editor-left-rail-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border: 1px solid rgba(15, 23, 42, 0.12);
		border-radius: 0.75rem;
		background: #fff;
		cursor: pointer;
	}

	.canvas-editor-left-rail-button-active {
		background: #111827;
		color: #fff;
		border-color: #111827;
	}
</style>
