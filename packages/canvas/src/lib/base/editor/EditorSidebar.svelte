<script lang="ts">
	import SlidersHorizontalIcon from "@lucide/svelte/icons/sliders-horizontal";
	import SettingsIcon from "@lucide/svelte/icons/settings";
	import XIcon from "@lucide/svelte/icons/x";
	import { cn } from "$lib/utils.js";
	import CanvasEditorInspector from "./canvas-editor-inspector.svelte";
	import type { EditorSidebarProps } from "./types.js";

	let {
		mode = $bindable("docked"),
		components = $bindable([]),
		selection = $bindable(undefined),
		documentSelection = $bindable(undefined),
		clipboardAvailable = $bindable(false),
		clipboardNode = $bindable(undefined),
		componentCatalog = $bindable({}),
		editorConfig = $bindable({}),
		appConfig = $bindable({}),
		appEditorConfig = $bindable(undefined),
		updateProperty = $bindable(() => {}),
		updateAppProperty = $bindable(() => {}),
		class: className = "",
		isDraggable = $bindable(false),
		activePanel = $bindable("Properties"),
		onPanelChange = $bindable(() => {}),
		showTabs = true,
		mobile = false,
		onClose = undefined,
	}: EditorSidebarProps = $props();

	const panelOptions = [
		{ id: "Properties", label: "Properties", icon: SlidersHorizontalIcon },
		{ id: "Settings", label: "Settings", icon: SettingsIcon },
	] as const;

	const title = $derived.by(() => {
		if (activePanel === "Settings") {
			return "Settings";
		}

		return selection ? selection.component.type : "Document";
	});
</script>

<div class={cn("editor-sidebar", mobile && "editor-sidebar-mobile", className)} data-active-panel={activePanel}>
	<div class="editor-sidebar-header">
		{#if mobile}
			<div class="editor-sidebar-handle" aria-hidden="true"></div>
		{/if}
		<div class="editor-sidebar-header-row">
			<h2 class="editor-sidebar-title">{title}</h2>
			{#if mobile}
				<button
					type="button"
					class="editor-sidebar-close"
					onclick={() => onClose?.()}
					aria-label="Close editor panel"
				>
					<XIcon size={18} />
				</button>
			{/if}
		</div>

		{#if showTabs}
			<div class="editor-sidebar-tabs" role="tablist" aria-label="Editor inspector sections">
				{#each panelOptions as option}
					<button
						type="button"
						class={cn("editor-sidebar-tab", activePanel === option.id && "editor-sidebar-tab-active")}
						onclick={() => onPanelChange?.(option.id)}
						aria-label={option.label}
						title={option.label}
						aria-pressed={activePanel === option.id}
					>
						<option.icon size={14} />
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<div class="editor-sidebar-content">
		{#if activePanel === "Properties"}
			<CanvasEditorInspector
				{components}
				{selection}
				documentSelection={documentSelection}
				{componentCatalog}
				{editorConfig}
				{appConfig}
				{appEditorConfig}
				{updateProperty}
				{updateAppProperty}
			/>
		{:else}
			<CanvasEditorInspector
				{components}
				selection={undefined}
				documentSelection={undefined}
				{componentCatalog}
				{editorConfig}
				{appConfig}
				{appEditorConfig}
				{updateProperty}
				{updateAppProperty}
			/>
		{/if}
	</div>
</div>

<style>
	.editor-sidebar {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
		background: #ffffff;
	}

	.editor-sidebar-mobile {
		max-height: 70vh;
	}

	.editor-sidebar-header {
		padding: 1rem 1rem 0.75rem;
		border-bottom: 1px solid rgba(15, 23, 42, 0.08);
		position: sticky;
		top: 0;
		background: #ffffff;
		z-index: 2;
	}

	.editor-sidebar-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.editor-sidebar-title {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 650;
	}

	.editor-sidebar-tabs {
		display: flex;
		flex-wrap: nowrap;
		gap: 0.5rem;
		margin-top: 0.875rem;
	}

	.editor-sidebar-tab {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid rgba(15, 23, 42, 0.12);
		border-radius: 999px;
		background: #fff;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		font: inherit;
		font-size: 0.76rem;
		cursor: pointer;
		flex: 0 0 auto;
	}

	.editor-sidebar-tab-active {
		background: #111827;
		color: #fff;
		border-color: #111827;
	}

	.editor-sidebar-handle {
		width: 3rem;
		height: 0.3125rem;
		border-radius: 999px;
		background: rgba(15, 23, 42, 0.16);
		margin: 0 auto 0.75rem;
	}

	.editor-sidebar-close {
		border: 1px solid rgba(15, 23, 42, 0.12);
		border-radius: 999px;
		background: #fff;
		width: 2.25rem;
		height: 2.25rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		flex: 0 0 auto;
	}

	.editor-sidebar-content {
		flex: 1 1 auto;
		overflow: auto;
		padding: 1rem;
	}

	@media (max-width: 1023px) {
		.editor-sidebar-content {
			padding-bottom: 1.5rem;
		}

		.editor-sidebar-tab,
		.editor-sidebar-close {
			min-height: 44px;
			min-width: 44px;
		}
	}
</style>
