<script lang="ts">
import ChevronDown from "@lucide/svelte/icons/chevron-down";
import Layers3 from "@lucide/svelte/icons/layers-3";
import Settings from "@lucide/svelte/icons/settings";
import { onDestroy, onMount, setContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import type { CanvasNode } from "$lib/base/canvas/types.js";
import DropdownMenu from "$lib/components/view-ui/dropdown-menu.svelte";
import { cn } from "$lib/utils.js";
import { setEditorContext as setAppEditorContext } from "./context.js";
import EditorCanvas from "./EditorCanvas.svelte";
import EditorControls from "./EditorControls.svelte";
import EditorSidebar from "./EditorSidebar.svelte";
import { editorStore } from "./store.js";
import type {
	ComponentSelection,
	EditorMode,
	EditorPanel,
	EditorProps,
} from "./types.js";
import { getComponentDisplayLabel, isMobileDevice } from "./utils.js";

const isBrowser = typeof window !== "undefined";

let {
	components = $bindable([]),
	mode = $bindable("edit"),
	sidebarMode = $bindable("docked"),
	onChange,
	onModeChange,
	componentRegistry = $bindable(undefined),
	componentCatalog = $bindable({}),
	editorConfig = $bindable(undefined),
	appConfig = $bindable({}),
	appEditorConfig = $bindable(undefined),
	updateAppProperty = undefined,
	renderComponent,
	class: className,
}: EditorProps = $props();

const registryMap = new SvelteMap(
	Object.entries({
		...Object.fromEntries(
			Object.entries(componentCatalog || {}).map(([type, definition]) => [
				type,
				definition.component,
			]),
		),
		...componentRegistry,
	}),
);

let isMobile = $state(false);
let activePanel = $state<EditorPanel>("Properties");
let isSidebarOpen = $state(true);

const store = setAppEditorContext(editorStore);

const IS_MOBILE_CONTEXT_KEY = "isMobile";
setContext(IS_MOBILE_CONTEXT_KEY, () => isMobile);

$effect.pre(() => {
	store.setComponents(components || []);
	store.setMode(mode || "edit");
});

$effect(() => {
	isSidebarOpen = $store.sidebarVisible;
});

$effect(() => {
	store.setSidebarVisible(isSidebarOpen);
});

$effect(() => {
	if (sidebarMode === "auto") {
		store.setSidebarMode(isMobile ? "hidden" : "docked");
	} else {
		store.setSidebarMode(sidebarMode || "docked");
	}
});

$effect(() => {
	if (componentRegistry) {
		Object.entries(componentRegistry).forEach(([name, component]) => {
			store.registerComponent(name, component);
		});
	}
});

$effect(() => {
	if (onModeChange && $store.mode) {
		onModeChange($store.mode);
	}
});

function handleSelect(selection: ComponentSelection | undefined) {
	store.setSelection(selection);

	if (isMobile && $store.mode === "edit" && !selection && activePanel === "Properties") {
		store.setSidebarVisible(false);
	}
}

function openEditorPanel(panel: EditorPanel) {
	activePanel = panel;
	store.setSidebarVisible(true);
}

function handleRequestEdit(selection: ComponentSelection) {
	store.setSelection(selection);
	openEditorPanel("Properties");
}

function handleHover(component: CanvasNode | undefined) {
	store.setHoveredComponent(component);
}

function handleKeyDown(event: KeyboardEvent) {
	const target = event.target as HTMLElement;
	if (
		target.tagName === "INPUT" ||
		target.tagName === "TEXTAREA" ||
		target.getAttribute("contenteditable") === "true"
	) {
		return;
	}

	if (
		(event.ctrlKey || event.metaKey) &&
		event.key === "z" &&
		!event.shiftKey
	) {
		event.preventDefault();
		store.undo();
	}

	if (
		((event.ctrlKey || event.metaKey) && event.key === "z" && event.shiftKey) ||
		((event.ctrlKey || event.metaKey) && event.key === "y")
	) {
		event.preventDefault();
		store.redo();
	}

	if (
		(event.key === "Delete" || event.key === "Backspace") &&
		$store.selection
	) {
		event.preventDefault();
		store.deleteComponent($store.selection.path);
	}

	if ((event.ctrlKey || event.metaKey) && event.key === "p") {
		event.preventDefault();
		store.setMode($store.mode === "edit" ? "preview" : "edit");
	}

	if ((event.ctrlKey || event.metaKey) && event.key === "b") {
		event.preventDefault();
		store.setSidebarVisible(!$store.sidebarVisible);
	}
}

onMount(() => {
	if (isBrowser) {
		isMobile = isMobileDevice();
		if (isMobile && !$store.selection) {
			store.setSidebarVisible(false);
		}
		window.addEventListener("keydown", handleKeyDown);
	}
});

onDestroy(() => {
	if (isBrowser) {
		window.removeEventListener("keydown", handleKeyDown);
	}
});

const mobileMenuItems = $derived([
	{ id: "edit", label: "Edit", icon: Settings, onSelect: () => openEditorPanel("Properties") },
	{ id: "layers", label: "Layers", icon: Layers3, onSelect: () => openEditorPanel("Layers") },
]);
</script>

<div class={cn("studio-editor", className)} data-mode={$store.mode}>
	<div class="studio-editor-toolbar">
		<EditorControls
			mode={$store.mode}
			canUndo={$store.canUndo}
			canRedo={$store.canRedo}
			{activePanel}
			onUndo={() => store.undo()}
			onRedo={() => store.redo()}
			onModeChange={(newMode) => store.setMode(newMode)}
			onPanelChange={(newPanel) => (activePanel = newPanel)}
		/>
	</div>

	<div class="studio-editor-shell">
		<div class="studio-editor-body">
			{#if isMobile && $store.mode === "edit" && $store.selection}
				<div class="studio-editor-mobile-bar">
					<div class="studio-editor-mobile-meta">
						<div class="studio-editor-mobile-value">
							{getComponentDisplayLabel($store.selection.component, componentCatalog)}
						</div>
					</div>
					<div class="studio-editor-mobile-actions">
						<DropdownMenu
							triggerLabel="Edit"
							triggerIcon={Settings}
							items={mobileMenuItems}
							ariaLabel="Open selection actions"
							triggerClass="studio-editor-mobile-button studio-editor-mobile-button-primary"
							menuClass="studio-editor-mobile-menu"
						>
							<ChevronDown size={14} />
						</DropdownMenu>
					</div>
				</div>
			{/if}
			<EditorCanvas
				components={$store.components as any}
				mode={$store.mode as any}
				selection={$store.selection as any}
				onSelect={handleSelect as any}
				onHover={handleHover as any}
				onRequestEdit={handleRequestEdit as any}
				componentRegistry={registryMap}
				{componentCatalog}
				renderComponent={renderComponent as any}
			/>
		</div>
		{#if $store.mode === "edit" && $store.sidebarVisible}
			<EditorSidebar
				class="studio-editor-sidebar"
				{activePanel}
				mode={$store.mode as any}
				components={$store.components as any}
				selection={$store.selection as any}
				clipboardAvailable={Boolean($store.clipboard)}
				clipboardNode={$store.clipboard as any}
				{componentCatalog}
				{editorConfig}
				{appConfig}
				{appEditorConfig}
				updateAppProperty={updateAppProperty}
				updateProperty={(path, property, value) => {
					store.addHistoryEntry();
					store.updateProperty(path, property, value);
				}}
			/>
		{/if}
	</div>
</div>

<style>
	.studio-editor {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
		position: relative;
		overflow: hidden;
		background-color: var(--color-background);
		color: var(--foreground);
	}

	.studio-editor-toolbar {
		z-index: 10;
	}

	.studio-editor-shell {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		flex: 1 1 auto;
		min-height: 0;
	}

	.studio-editor-body {
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;
	}

	.studio-editor-sidebar {
		width: 24rem;
		max-width: 100%;
	}

	@media (max-width: 1023px) {
		.studio-editor-shell {
			grid-template-columns: minmax(0, 1fr);
		}

		.studio-editor-mobile-bar {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 0.75rem;
			padding: 0.75rem 1rem;
			border-bottom: 1px solid rgba(15, 23, 42, 0.08);
			background: rgba(255, 255, 255, 0.96);
			backdrop-filter: blur(8px);
		}

		.studio-editor-mobile-meta {
			min-width: 0;
			flex: 1 1 auto;
		}

		.studio-editor-mobile-value {
			font-size: 0.88rem;
			font-weight: 650;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.studio-editor-mobile-actions {
			position: relative;
			display: flex;
			flex: 0 0 auto;
		}

		.studio-editor-mobile-button {
			display: inline-flex;
			align-items: center;
			gap: 0.45rem;
			min-height: 38px;
			border: 1px solid rgba(15, 23, 42, 0.12);
			border-radius: 999px;
			background: #fff;
			padding: 0.45rem 0.7rem;
			font: inherit;
			font-size: 0.78rem;
			font-weight: 600;
		}

		.studio-editor-mobile-button-primary {
			box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
		}

		:global(.studio-editor-mobile-menu.canvas-dropdown-menu) {
			z-index: 260;
		}
	}
</style>
