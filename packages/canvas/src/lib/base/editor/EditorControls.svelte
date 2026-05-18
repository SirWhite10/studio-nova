<script lang="ts">
import Eye from "@lucide/svelte/icons/eye";
import Layers3 from "@lucide/svelte/icons/layers-3";
import Plus from "@lucide/svelte/icons/plus";
import Redo2 from "@lucide/svelte/icons/redo-2";
import Settings from "@lucide/svelte/icons/settings";
import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
import SquarePen from "@lucide/svelte/icons/square-pen";
import Undo2 from "@lucide/svelte/icons/undo-2";
import { cn } from "$lib/utils.js";
// Import types
import type { EditorControlsProps, EditorMode, EditorPanel } from "./types.js";

let {
	mode,
	canUndo,
	canRedo,
	activePanel = $bindable("Properties"),
	onUndo,
	onRedo,
	onModeChange,
	onPanelChange = $bindable(() => {}),
	class: className,
}: EditorControlsProps & {
	activePanel?: EditorPanel;
	onPanelChange?: (panel: EditorPanel) => void;
} = $props();

const panelOptions: Array<{ id: EditorPanel; label: string; icon: typeof Settings }> = [
	{ id: "Properties", label: "Properties", icon: SlidersHorizontal },
	{ id: "Layers", label: "Layers", icon: Layers3 },
	{ id: "Components", label: "Add", icon: Plus },
	{ id: "Settings", label: "Settings", icon: Settings },
];

// Toggle editor mode
function toggleMode() {
	const newMode: EditorMode = mode === "edit" ? "preview" : "edit";

	if (onModeChange) {
		onModeChange(newMode);
	}
}
</script>

<div class={cn("editor-controls border-b p-2", className)}>
	<div class="editor-controls-row">
		<div class="editor-controls-group">
			<button class="editor-button editor-icon-button" type="button" disabled={!canUndo} onclick={() => onUndo?.()} aria-label="Undo" title="Undo">
				<Undo2 size={15} />
				<span class="sr-only">Undo</span>
			</button>
			<button class="editor-button editor-icon-button" type="button" disabled={!canRedo} onclick={() => onRedo?.()} aria-label="Redo" title="Redo">
				<Redo2 size={15} />
				<span class="sr-only">Redo</span>
			</button>
		</div>

		<div class="editor-controls-group editor-mode-toggle">
			<button
				class={cn("editor-segment editor-icon-button", mode === "edit" && "editor-segment-active")}
				type="button"
				aria-label="Edit mode"
				title="Edit mode"
				onclick={() => onModeChange?.("edit")}
			>
				<SquarePen size={15} />
				<span class="sr-only">Edit</span>
			</button>
			<button
				class={cn("editor-segment editor-icon-button", mode === "preview" && "editor-segment-active")}
				type="button"
				aria-label="Preview mode"
				title="Preview mode"
				onclick={() => onModeChange?.("preview")}
			>
				<Eye size={15} />
				<span class="sr-only">Preview</span>
			</button>
		</div>

		<div class="editor-controls-group editor-panel-toggle">
			{#each panelOptions as option}
				<button
					class={cn("editor-segment editor-icon-button", activePanel === option.id && "editor-segment-active")}
					type="button"
					aria-label={option.label}
					title={option.label}
					onclick={() => onPanelChange(option.id)}
				>
					<option.icon size={15} />
					<span class="sr-only">{option.label}</span>
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.editor-controls-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.editor-controls-group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
	}

	.editor-button,
	.editor-segment {
		border: 1px solid rgba(15, 23, 42, 0.12);
		border-radius: 0.75rem;
		background: #fff;
		padding: 0.5rem 0.75rem;
		font: inherit;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.editor-icon-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.35rem;
		height: 2.35rem;
		padding: 0;
	}

	.editor-button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.editor-segment-active {
		background: #111827;
		color: #fff;
		border-color: #111827;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@media (max-width: 1023px) {
		.editor-controls-row {
			flex-wrap: nowrap;
			align-items: center;
			justify-content: space-between;
		}

		.editor-controls-group {
			flex-wrap: nowrap;
		}

		.editor-button,
		.editor-segment {
			min-height: 44px;
		}

		.editor-icon-button {
			width: 2.75rem;
			height: 2.75rem;
		}
	}
</style>
