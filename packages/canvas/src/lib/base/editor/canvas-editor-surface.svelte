<script lang="ts">
	import Maximize2Icon from "@lucide/svelte/icons/maximize-2";
	import MinusIcon from "@lucide/svelte/icons/minus";
	import MonitorIcon from "@lucide/svelte/icons/monitor";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import SmartphoneIcon from "@lucide/svelte/icons/smartphone";
	import TabletIcon from "@lucide/svelte/icons/tablet";
	import { cn } from "$lib/utils.js";
	import CanvasEditorDropZone from "./canvas-editor-drop-zone.svelte";
	import EditorCanvas from "./EditorCanvas.svelte";
	import type { EditorCanvasProps } from "./types.js";

	type ViewportPreset = "mobile" | "tablet" | "desktop" | "full";

	const viewportPresets: Array<{ id: ViewportPreset; label: string; width?: number; icon: typeof MonitorIcon }> = [
		{ id: "mobile", label: "Mobile", width: 390, icon: SmartphoneIcon },
		{ id: "tablet", label: "Tablet", width: 768, icon: TabletIcon },
		{ id: "desktop", label: "Desktop", width: 1200, icon: MonitorIcon },
		{ id: "full", label: "Full", icon: Maximize2Icon },
	];

	let { mobile = false, ...props }: EditorCanvasProps & { mobile?: boolean } = $props();
	let viewport = $state<ViewportPreset>("desktop");
	let zoom = $state(100);

	$effect(() => {
		if (mobile && viewport === "desktop") {
			viewport = "full";
		}
	});

	const activePreset = $derived(viewportPresets.find((preset) => preset.id === viewport) ?? viewportPresets[2]);
	const viewportWidth = $derived(activePreset.width ? `${activePreset.width}px` : "100%");
	const scale = $derived(zoom / 100);

	function clampZoom(value: number) {
		return Math.max(25, Math.min(200, Math.round(value)));
	}

	function setPreset(preset: ViewportPreset) {
		viewport = preset;
		if (preset === "full") zoom = 100;
	}

	function fitToViewport() {
		viewport = "full";
		zoom = 100;
	}
</script>

<div class={cn("canvas-editor-surface", mobile && "canvas-editor-surface-mobile", props.class)}>
	<div class={cn("canvas-editor-surface-toolbar", mobile && "canvas-editor-surface-toolbar-mobile")} aria-label="Canvas viewport controls">
		<div class="canvas-editor-surface-toolbar-group">
			{#each viewportPresets as preset}
				<button
					type="button"
					class={cn("canvas-editor-surface-tool", viewport === preset.id && "canvas-editor-surface-tool-active")}
					onclick={() => setPreset(preset.id)}
					aria-label={preset.label}
					title={preset.label}
				>
					<preset.icon size={15} />
				</button>
			{/each}
		</div>
		<div class="canvas-editor-surface-toolbar-group">
			<button type="button" class="canvas-editor-surface-tool" onclick={() => (zoom = clampZoom(zoom - 10))} aria-label="Zoom out"><MinusIcon size={14} /></button>
			{#if !mobile}
				<label class="canvas-editor-surface-zoom-label">
					<span class="sr-only">Zoom</span>
					<input type="range" min="25" max="200" step="5" bind:value={zoom} aria-label="Zoom level" />
					<span>{zoom}%</span>
				</label>
			{/if}
			<button type="button" class="canvas-editor-surface-tool" onclick={() => (zoom = clampZoom(zoom + 10))} aria-label="Zoom in"><PlusIcon size={14} /></button>
			<button type="button" class="canvas-editor-surface-tool" onclick={fitToViewport} aria-label="Fit canvas"><RotateCcwIcon size={14} /></button>
		</div>
	</div>

	<div class={cn("canvas-editor-surface-scroll", mobile && "canvas-editor-surface-scroll-mobile")}>
		<div class="canvas-editor-surface-stage" style:width={viewportWidth} style:transform={`scale(${scale})`}>
			<EditorCanvas {...props} class="canvas-editor-surface-canvas" />
			<CanvasEditorDropZone componentCatalog={props.componentCatalog} selection={props.selection} />
		</div>
	</div>
</div>

<style>
	.canvas-editor-surface {
		position: relative;
		display: flex;
		min-height: 100%;
		height: 100%;
		flex-direction: column;
		overflow: hidden;
		background:
			linear-gradient(color-mix(in oklab, var(--editor-border, var(--border)), transparent 76%) 1px, transparent 1px),
			linear-gradient(90deg, color-mix(in oklab, var(--editor-border, var(--border)), transparent 76%) 1px, transparent 1px),
			var(--editor-bg, var(--muted));
		background-size: 24px 24px;
	}

	.canvas-editor-surface-toolbar {
		position: absolute;
		top: 0.85rem;
		left: 50%;
		z-index: 50;
		display: flex;
		translate: -50% 0;
		align-items: center;
		gap: 0.5rem;
		border: 1px solid var(--editor-border, var(--border));
		border-radius: 999px;
		background: color-mix(in oklab, var(--editor-panel, var(--background)), transparent 4%);
		padding: 0.3rem;
		box-shadow: 0 10px 28px color-mix(in oklab, var(--foreground), transparent 90%);
		backdrop-filter: blur(12px);
	}

	.canvas-editor-surface-toolbar-mobile {
		top: 0.75rem;
		left: auto;
		right: 0.75rem;
		translate: 0 0;
		gap: 0.35rem;
		padding: 0.25rem;
		border-radius: 1rem;
	}

	.canvas-editor-surface-toolbar-group {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
	}

	.canvas-editor-surface-toolbar-group + .canvas-editor-surface-toolbar-group {
		border-left: 1px solid var(--editor-border, var(--border));
		padding-left: 0.45rem;
	}

	.canvas-editor-surface-toolbar-mobile .canvas-editor-surface-toolbar-group + .canvas-editor-surface-toolbar-group {
		padding-left: 0.35rem;
	}

	.canvas-editor-surface-tool {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.9rem;
		height: 1.9rem;
		border: 1px solid transparent;
		border-radius: 999px;
		background: transparent;
		color: var(--editor-fg-muted, color-mix(in oklab, var(--foreground), transparent 35%));
		font: inherit;
		cursor: pointer;
	}

	.canvas-editor-surface-tool:hover,
	.canvas-editor-surface-tool-active {
		border-color: var(--editor-border, var(--border));
		background: var(--editor-panel-elevated, var(--background));
		color: var(--editor-fg, var(--foreground));
	}

	.canvas-editor-surface-zoom-label {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0 0.25rem;
		font-size: 0.74rem;
		font-weight: 700;
		color: var(--editor-fg, var(--foreground));
	}

	.canvas-editor-surface-zoom-label input {
		width: 5rem;
	}

	.canvas-editor-surface-scroll {
		min-height: 0;
		flex: 1;
		overflow: auto;
		padding: 5rem 2rem 3rem;
	}

	.canvas-editor-surface-scroll-mobile {
		padding: 4.5rem 0.75rem 8.75rem;
	}

	.canvas-editor-surface-stage {
		position: relative;
		min-height: 100%;
		margin: 0 auto;
		transform-origin: top center;
		transition: width 180ms ease, transform 180ms ease;
		border: 1px solid var(--editor-border, var(--border));
		border-radius: 1rem;
		background: var(--background);
		box-shadow: 0 22px 60px color-mix(in oklab, var(--foreground), transparent 90%);
	}

	:global(.canvas-editor-surface-canvas.editor-canvas) {
		min-height: 100%;
		padding: 1rem;
		background: var(--background);
	}
</style>
