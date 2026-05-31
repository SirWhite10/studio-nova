<script lang="ts">
	import AppWindowIcon from "@lucide/svelte/icons/app-window";
	import BookOpenIcon from "@lucide/svelte/icons/book-open";
	import GlobeIcon from "@lucide/svelte/icons/globe";
	import PaletteIcon from "@lucide/svelte/icons/palette";
	import PlugZapIcon from "@lucide/svelte/icons/plug-zap";
	import CanvasEditorAppInspector from "./canvas-editor-app-inspector.svelte";
	import CanvasEditorAppPlaceholder from "./canvas-editor-app-placeholder.svelte";
	import type { EditorAppSection, EditorComponent } from "./types.js";

	const shortcuts: Array<{ id: "pages" | Exclude<EditorAppSection, "seo">; label: string; icon: typeof AppWindowIcon }> = [
		{ id: "app-settings", label: "Settings", icon: AppWindowIcon },
		{ id: "providers", label: "Providers", icon: PlugZapIcon },
		{ id: "metadata", label: "Metadata", icon: GlobeIcon },
		{ id: "theme", label: "Theme", icon: PaletteIcon },
		{ id: "pages", label: "Pages", icon: BookOpenIcon },
	];

	let {
		appName = "Canvas App",
		appConfig = {},
		appEditorConfig = undefined,
		updateAppProperty = undefined,
		appSection = "app-settings",
		onSelectSection = undefined,
		onOpenPages = undefined,
	}: {
		appName?: string;
		appConfig?: Record<string, any>;
		appEditorConfig?: EditorComponent<any>;
		updateAppProperty?: (property: string, value: any) => void;
		appSection?: Exclude<EditorAppSection, "seo">;
		onSelectSection?: (section: Exclude<EditorAppSection, "seo">) => void;
		onOpenPages?: () => void;
	} = $props();
</script>

<div class="canvas-editor-mobile-app-panel">
	<div class="canvas-editor-mobile-app-hero">
		<div class="canvas-editor-mobile-app-badge">{appName.slice(0, 1)}</div>
		<div>
			<h3 class="canvas-editor-mobile-app-title">{appName}</h3>
			<p class="canvas-editor-mobile-app-copy">App-level setup lives here: providers, additional pages, metadata, and shared configuration.</p>
		</div>
	</div>

	<div class="canvas-editor-mobile-app-shortcuts">
		{#each shortcuts as shortcut}
			<button
				type="button"
				class:canvas-editor-mobile-app-shortcut-active={shortcut.id === appSection}
				onclick={() => {
					if (shortcut.id === "pages") {
						onOpenPages?.();
						return;
					}
					onSelectSection?.(shortcut.id);
				}}
			>
				<shortcut.icon size={16} />
				<span>{shortcut.label}</span>
			</button>
		{/each}
	</div>

	{#if appSection === "app-settings"}
		<CanvasEditorAppInspector {appConfig} {appEditorConfig} {updateAppProperty} />
	{:else}
		<CanvasEditorAppPlaceholder section={appSection} />
	{/if}
</div>

<style>
	.canvas-editor-mobile-app-panel {
		display: grid;
		gap: 1rem;
	}

	.canvas-editor-mobile-app-hero {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.9rem;
		padding: 1rem;
		border: 1px solid var(--editor-border, var(--border));
		border-radius: 1rem;
		background: var(--editor-panel-muted, color-mix(in oklab, var(--background), var(--muted) 18%));
	}

	.canvas-editor-mobile-app-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.85rem;
		background: linear-gradient(135deg, #f2ca50, #d4af37);
		color: #3c2f00;
		font-size: 0.95rem;
		font-weight: 800;
	}

	.canvas-editor-mobile-app-title {
		margin: 0;
		font-size: 0.96rem;
		font-weight: 700;
	}

	.canvas-editor-mobile-app-copy {
		margin: 0.35rem 0 0;
		font-size: 0.82rem;
		line-height: 1.55;
		color: var(--editor-fg-muted, color-mix(in oklab, var(--foreground), transparent 30%));
	}

	.canvas-editor-mobile-app-shortcuts {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.7rem;
	}

	.canvas-editor-mobile-app-shortcuts button {
		display: inline-flex;
		align-items: center;
		justify-content: flex-start;
		gap: 0.55rem;
		min-height: 2.9rem;
		padding: 0.8rem 0.9rem;
		border: 1px solid var(--editor-border, var(--border));
		border-radius: 0.95rem;
		background: var(--editor-panel-elevated, var(--background));
		color: var(--editor-fg, var(--foreground));
		font: inherit;
		font-size: 0.82rem;
		font-weight: 650;
		cursor: pointer;
	}

	.canvas-editor-mobile-app-shortcut-active {
		border-color: color-mix(in oklab, var(--editor-accent, var(--primary)), transparent 65%);
		background: color-mix(in oklab, var(--editor-accent, var(--primary)), transparent 88%);
		color: var(--editor-accent-foreground, var(--primary));
	}
</style>
