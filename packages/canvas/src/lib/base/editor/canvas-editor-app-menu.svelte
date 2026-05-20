<script lang="ts">
	import AppWindowIcon from "@lucide/svelte/icons/app-window";
	import BookOpenIcon from "@lucide/svelte/icons/book-open";
	import GlobeIcon from "@lucide/svelte/icons/globe";
	import PaletteIcon from "@lucide/svelte/icons/palette";
	import PlugZapIcon from "@lucide/svelte/icons/plug-zap";
	import ScanSearchIcon from "@lucide/svelte/icons/scan-search";
	import DropdownMenu from "$lib/components/view-ui/dropdown-menu.svelte";

	let {
		appName = "Canvas App",
		onSelectSection = undefined,
		onOpenPages = undefined,
	}: {
		appName?: string;
		onSelectSection?: (section: "app-settings" | "theme" | "providers" | "seo" | "metadata") => void;
		onOpenPages?: () => void;
	} = $props();

	const items = [
		{ id: "app-settings", label: "App Settings", icon: AppWindowIcon, onSelect: () => onSelectSection?.("app-settings") },
		{ id: "theme", label: "Theme", icon: PaletteIcon, onSelect: () => onSelectSection?.("theme") },
		{ id: "providers", label: "Providers", icon: PlugZapIcon, onSelect: () => onSelectSection?.("providers") },
		{ id: "seo", label: "SEO", icon: ScanSearchIcon, onSelect: () => onSelectSection?.("seo") },
		{ id: "metadata", label: "Metadata", icon: GlobeIcon, onSelect: () => onSelectSection?.("metadata") },
		{ id: "pages", label: "Pages", icon: BookOpenIcon, onSelect: () => onOpenPages?.() },
	];
</script>

<DropdownMenu
	triggerClass="canvas-editor-app-menu-trigger"
	menuClass="canvas-editor-app-menu"
	ariaLabel={`Open ${appName} workspace menu`}
	items={items}
	iconOnly={true}
>
	<span class="canvas-editor-app-menu-badge" aria-hidden="true">C</span>
</DropdownMenu>

<style>
	:global(.canvas-editor-app-menu-trigger) {
		justify-content: center;
		gap: 0;
		width: 2.25rem;
		height: 2.25rem;
		min-width: 2.25rem;
		padding: 0;
		border-radius: 0.75rem;
		border-color: var(--editor-border);
		background: var(--editor-panel);
		color: var(--editor-fg);
		box-shadow: var(--editor-shadow-sm);
	}

	.canvas-editor-app-menu-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: calc(var(--editor-radius) - 0.1rem);
		background: linear-gradient(135deg, #f2ca50, #d4af37);
		color: #3c2f00;
		font-size: 0.8rem;
		font-weight: 700;
		flex: 0 0 auto;
	}

	:global(.canvas-editor-app-menu.canvas-dropdown-menu) {
		min-width: 13rem;
	}
</style>
