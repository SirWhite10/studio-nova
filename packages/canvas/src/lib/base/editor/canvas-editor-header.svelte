<script lang="ts">
	import EyeIcon from "@lucide/svelte/icons/eye";
	import PanelLeftIcon from "@lucide/svelte/icons/panel-left";
	import PanelRightIcon from "@lucide/svelte/icons/panel-right";
	import Redo2Icon from "@lucide/svelte/icons/redo-2";
	import SaveIcon from "@lucide/svelte/icons/save";
	import Undo2Icon from "@lucide/svelte/icons/undo-2";
	import { cn } from "$lib/utils.js";

	let {
		title = "Document",
		preview = false,
		canUndo = false,
		canRedo = false,
		canSave = false,
		onToggleLeft = undefined,
		onToggleRight = undefined,
		onUndo = undefined,
		onRedo = undefined,
		onTogglePreview = undefined,
		onSave = undefined,
	}: {
		title?: string;
		preview?: boolean;
		canUndo?: boolean;
		canRedo?: boolean;
		canSave?: boolean;
		onToggleLeft?: () => void;
		onToggleRight?: () => void;
		onUndo?: () => void;
		onRedo?: () => void;
		onTogglePreview?: () => void;
		onSave?: () => void;
	} = $props();
</script>

<header class="canvas-editor-header sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-black/10 bg-slate-50/95 px-3 backdrop-blur">
	<div class="flex items-center gap-2">
		<button type="button" class="canvas-editor-header-icon-button" onclick={() => onToggleLeft?.()} aria-label="Toggle left sidebar">
			<PanelLeftIcon size={16} />
		</button>
		<button type="button" class="canvas-editor-header-icon-button" onclick={() => onToggleRight?.()} aria-label="Toggle right sidebar">
			<PanelRightIcon size={16} />
		</button>
	</div>

	<div class="min-w-0 flex-1 text-center">
		<div class="truncate text-sm font-semibold tracking-tight text-slate-900">{title}</div>
	</div>

	<div class="flex items-center justify-end gap-2">
		<button type="button" class="canvas-editor-header-icon-button" onclick={() => onUndo?.()} aria-label="Undo" disabled={!canUndo}>
			<Undo2Icon size={16} />
		</button>
		<button type="button" class="canvas-editor-header-icon-button" onclick={() => onRedo?.()} aria-label="Redo" disabled={!canRedo}>
			<Redo2Icon size={16} />
		</button>
		<button
			type="button"
			class={cn("canvas-editor-header-button", preview && "canvas-editor-header-button-active")}
			onclick={() => onTogglePreview?.()}
		>
			<EyeIcon size={15} />
			<span>{preview ? "Editing" : "Preview"}</span>
		</button>
		<button type="button" class="canvas-editor-header-button" onclick={() => onSave?.()} disabled={!canSave}>
			<SaveIcon size={15} />
			<span>Save</span>
		</button>
	</div>
</header>

<style>
	.canvas-editor-header-icon-button,
	.canvas-editor-header-button {
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		border: 1px solid rgba(15, 23, 42, 0.12);
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.92);
		color: #0f172a;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
	}

	.canvas-editor-header-icon-button {
		width: 2.25rem;
		height: 2.25rem;
	}

	.canvas-editor-header-button {
		min-height: 2.25rem;
		padding: 0 0.8rem;
	}

	.canvas-editor-header-button-active {
		background: #111827;
		border-color: #111827;
		color: #fff;
	}

	.canvas-editor-header-icon-button:disabled,
	.canvas-editor-header-button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>
