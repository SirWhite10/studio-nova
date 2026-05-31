<script lang="ts">
	import AppWindowIcon from "@lucide/svelte/icons/app-window";
	import BookOpenIcon from "@lucide/svelte/icons/book-open";
	import FilePenLineIcon from "@lucide/svelte/icons/file-pen-line";
	import EyeIcon from "@lucide/svelte/icons/eye";
	import Redo2Icon from "@lucide/svelte/icons/redo-2";
	import SaveIcon from "@lucide/svelte/icons/save";
	import Settings2Icon from "@lucide/svelte/icons/settings-2";
	import Undo2Icon from "@lucide/svelte/icons/undo-2";
	import WrenchIcon from "@lucide/svelte/icons/wrench";
	import XIcon from "@lucide/svelte/icons/x";
	import * as Dialog from "$lib/components/view-ui/dialog/index.js";

	let {
		open = $bindable(false),
		appName = "Canvas App",
		previewMode = false,
		canUndo = false,
		canRedo = false,
		canSave = false,
		onTogglePreview = undefined,
		onUndo = undefined,
		onRedo = undefined,
		onSave = undefined,
		onOpenDocument = undefined,
		onOpenApp = undefined,
		onOpenPages = undefined,
		onOpenEditorSettings = undefined,
	}: {
		open?: boolean;
		appName?: string;
		previewMode?: boolean;
		canUndo?: boolean;
		canRedo?: boolean;
		canSave?: boolean;
		onTogglePreview?: () => void;
		onUndo?: () => void;
		onRedo?: () => void;
		onSave?: (() => void) | undefined;
		onOpenDocument?: () => void;
		onOpenApp?: () => void;
		onOpenPages?: () => void;
		onOpenEditorSettings?: () => void;
	} = $props();

	function closeAnd(run?: () => void) {
		open = false;
		run?.();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="canvas-editor-mobile-more-dialog border-0 bg-[color:var(--editor-panel)] text-[color:var(--editor-fg)] shadow-2xl" showCloseButton={false}>
		<div class="canvas-editor-mobile-more-shell">
			<div class="canvas-editor-mobile-more-header">
				<div>
					<h2>More</h2>
					<p>Workspace actions, broader settings, and lower-frequency tools for {appName}.</p>
				</div>
				<Dialog.Close class="canvas-editor-mobile-more-close">
					<XIcon size={18} />
					<span class="sr-only">Close more dialog</span>
				</Dialog.Close>
			</div>

			<div class="canvas-editor-mobile-more-body">
				<section>
					<h3>Jump to</h3>
					<div class="canvas-editor-mobile-more-grid">
						<button type="button" onclick={() => closeAnd(onOpenDocument)}>
							<FilePenLineIcon size={18} />
							<span>Document</span>
							<small>Edit the current page, metadata, and page-level SEO.</small>
						</button>
						<button type="button" onclick={() => closeAnd(onOpenApp)}>
							<AppWindowIcon size={18} />
							<span>App</span>
							<small>Open providers, additional pages, app identity, and shared settings.</small>
						</button>
					</div>
				</section>

				<section>
					<h3>Workspace actions</h3>
					<div class="canvas-editor-mobile-more-grid">
						<button type="button" onclick={() => closeAnd(onTogglePreview)}>
							<EyeIcon size={18} />
							<span>{previewMode ? "Exit Preview" : "Preview"}</span>
							<small>Toggle between editing and previewing the current canvas.</small>
						</button>
						<button type="button" disabled={!canUndo} onclick={() => closeAnd(onUndo)}>
							<Undo2Icon size={18} />
							<span>Undo</span>
							<small>Step back through recent canvas changes.</small>
						</button>
						<button type="button" disabled={!canRedo} onclick={() => closeAnd(onRedo)}>
							<Redo2Icon size={18} />
							<span>Redo</span>
							<small>Restore the next change in history.</small>
						</button>
						<button type="button" disabled={!canSave} onclick={() => closeAnd(onSave)}>
							<SaveIcon size={18} />
							<span>Save</span>
							<small>Persist the current document before switching contexts.</small>
						</button>
					</div>
				</section>

				<section>
					<h3>App utilities</h3>
					<div class="canvas-editor-mobile-more-grid">
						<button type="button" onclick={() => closeAnd(onOpenPages)}>
							<BookOpenIcon size={18} />
							<span>Pages</span>
							<small>Manage additional pages without losing your current place.</small>
						</button>
					</div>
				</section>

				<section>
					<h3>Editor settings</h3>
					<div class="canvas-editor-mobile-more-grid">
						<button type="button" onclick={() => closeAnd(onOpenEditorSettings)}>
							<Settings2Icon size={18} />
							<span>Editor Settings</span>
							<small>Adjust shell and workflow preferences for this editor.</small>
						</button>
						<div class="canvas-editor-mobile-more-note">
							<WrenchIcon size={18} />
							<small>Editor settings stay pinned to the bottom of this overflow screen so they are always easy to find.</small>
						</div>
					</div>
				</section>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

<style>
	:global(.canvas-editor-mobile-more-dialog) {
		width: min(100vw, 100%);
		max-width: 100vw;
		height: 100dvh;
		max-height: 100dvh;
		border-radius: 0;
		padding: 0;
	}

	.canvas-editor-mobile-more-shell {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.canvas-editor-mobile-more-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.25rem 1rem 1rem;
		border-bottom: 1px solid var(--editor-border, var(--border));
	}

	.canvas-editor-mobile-more-header h2,
	.canvas-editor-mobile-more-header p,
	.canvas-editor-mobile-more-body h3 {
		margin: 0;
	}

	.canvas-editor-mobile-more-header h2 {
		font-size: 1rem;
		font-weight: 700;
	}

	.canvas-editor-mobile-more-header p {
		margin-top: 0.35rem;
		font-size: 0.85rem;
		line-height: 1.55;
		color: var(--editor-fg-muted, color-mix(in oklab, var(--foreground), transparent 30%));
	}

	:global(.canvas-editor-mobile-more-close) {
		display: inline-flex;
		width: 2.5rem;
		height: 2.5rem;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: 1px solid var(--editor-border, var(--border));
		border-radius: 0.9rem;
		background: var(--editor-panel-elevated, var(--background));
		color: var(--editor-fg, var(--foreground));
	}

	.canvas-editor-mobile-more-body {
		flex: 1 1 auto;
		overflow: auto;
		display: grid;
		gap: 1.1rem;
		padding: 1rem;
	}

	.canvas-editor-mobile-more-body section {
		display: grid;
		gap: 0.75rem;
	}

	.canvas-editor-mobile-more-body h3 {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: color-mix(in oklab, var(--editor-fg, var(--foreground)), transparent 16%);
	}

	.canvas-editor-mobile-more-grid {
		display: grid;
		gap: 0.8rem;
	}

	.canvas-editor-mobile-more-grid button,
	.canvas-editor-mobile-more-note {
		display: grid;
		gap: 0.25rem;
		padding: 1rem;
		border: 1px solid var(--editor-border, var(--border));
		border-radius: 1rem;
		background: var(--editor-panel-muted, color-mix(in oklab, var(--background), var(--muted) 18%));
		color: var(--editor-fg, var(--foreground));
		text-align: left;
	}

	.canvas-editor-mobile-more-grid button {
		cursor: pointer;
		font: inherit;
	}

	.canvas-editor-mobile-more-grid button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.canvas-editor-mobile-more-grid span {
		font-size: 0.92rem;
		font-weight: 700;
	}

	.canvas-editor-mobile-more-grid small,
	.canvas-editor-mobile-more-note small {
		font-size: 0.8rem;
		line-height: 1.55;
		color: var(--editor-fg-muted, color-mix(in oklab, var(--foreground), transparent 30%));
	}
</style>
