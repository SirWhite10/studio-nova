<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { SvelteMap } from "svelte/reactivity";
	import * as Sidebar from "$lib/shadcn-components/ui/sidebar/index.js";
	import "./editor-theme.css";
	import { cn } from "$lib/utils.js";
	import { setEditorContext } from "./context.js";
	import CanvasEditorHeader from "./canvas-editor-header.svelte";
	import CanvasEditorLeftSidebar from "./canvas-editor-left-sidebar.svelte";
	import CanvasEditorRightSidebar from "./canvas-editor-right-sidebar.svelte";
	import CanvasEditorPagesDialog from "./canvas-editor-pages-dialog.svelte";
	import CanvasEditorSurface from "./canvas-editor-surface.svelte";
	import CanvasEditorTrigger from "./canvas-editor-trigger.svelte";
	import EditorSidebar from "./EditorSidebar.svelte";
	import EditorSettings from "./editor-settings.svelte";
	import { createEditorStore } from "./store.js";
	import type {
		ComponentSelection,
		EditorAppSection,
		EditorLeftPanel,
		EditorProps,
	} from "./types.js";

	type MobileEditorPanel = EditorLeftPanel | "Properties";
	const isBrowser = typeof window !== "undefined";

	let {
		document = undefined,
		components = $bindable([]),
		providers = [],
		providerData = {},
		providerActions = {},
		canvasAppConfig = undefined,
		mode = $bindable("edit"),
		sidebarMode = $bindable("docked"),
		onChange,
		onModeChange,
		componentRegistry = $bindable(undefined),
		componentCatalog = $bindable({}),
		editorConfig = $bindable(undefined),
		documentConfig = $bindable({}),
		documentEditorConfig = $bindable(undefined),
		updateDocumentProperty = undefined,
		appConfig = $bindable({}),
		appEditorConfig = $bindable(undefined),
		updateAppProperty = undefined,
		renderComponent,
		leftSidebar = undefined,
		onSave = undefined,
		class: className,
	}: EditorProps = $props();

	const store = setEditorContext(createEditorStore(components || []));
	const registryMap = $derived(
		new SvelteMap(
			Object.entries({
				...Object.fromEntries(
					Object.entries(componentCatalog || {}).map(([type, definition]) => [type, definition.component]),
				),
				...componentRegistry,
			}),
		),
	);

	let isMobile = $state(false);
	let leftSidebarOpen = $state(true);
	let rightSidebarOpen = $state(true);
	let mobileSheetOpen = $state(false);
	let activeWorkspace = $state<EditorLeftPanel>("Outline");
	let activeAppSection = $state<EditorAppSection | undefined>(undefined);
	let activeMobilePanel = $state<MobileEditorPanel>("Properties");
	let pagesDialogOpen = $state(false);
	let editorSettingsOpen = $state(false);
	let lastIncomingComponents = $state("");
	let lastEmittedComponents = $state("");

	const documentTitle = $derived(appConfig?.name || "Document");
	const appThemeMode = $derived(canvasAppConfig?.theme?.mode ?? appConfig?.theme?.mode ?? "system");
	const previewMode = $derived($store.mode === "preview");
	const canUndo = $derived($store.historyIndex > 0);
	const canRedo = $derived($store.historyIndex < $store.history.length - 1);

	function updateViewportState() {
		if (!isBrowser) return;
		isMobile = window.innerWidth < 1024;
	}

	$effect.pre(() => {
		const nextMode = mode || "edit";
		const nextSidebarMode = sidebarMode || "docked";
		const nextComponents = components || [];
		const nextComponentsSerialized = JSON.stringify(nextComponents);

		if (lastIncomingComponents !== nextComponentsSerialized) {
			lastIncomingComponents = nextComponentsSerialized;
			store.setComponents(nextComponents, { trackHistory: false });
		}

		if ($store.mode !== nextMode) store.setMode(nextMode);
		if ($store.sidebarMode !== nextSidebarMode) store.setSidebarMode(nextSidebarMode);
	});

	$effect(() => {
		if (componentRegistry) {
			Object.entries(componentRegistry).forEach(([name, component]) => {
				store.registerComponent(name, component);
			});
		}
	});

	$effect(() => {
		if (onModeChange && $store.mode) onModeChange($store.mode);
	});

	$effect(() => {
		const storeComponentsSerialized = JSON.stringify($store.components);
		if (storeComponentsSerialized === lastIncomingComponents) return;
		if (storeComponentsSerialized === lastEmittedComponents) return;
		lastEmittedComponents = storeComponentsSerialized;
		onChange?.($store.components);
	});

	function handleSelect(selection: ComponentSelection | undefined) {
		store.setSelection(selection);
		activeMobilePanel = "Properties";
	}

	function handleRequestEdit(selection: ComponentSelection) {
		store.setSelection(selection);
		activeMobilePanel = "Properties";
		mobileSheetOpen = true;
	}

	function handleHover() {}
	function togglePreview() {
		store.setMode($store.mode === "edit" ? "preview" : "edit");
	}
	function updateAppThemeMode(mode: "system" | "light" | "dark") {
		const currentTheme = appConfig?.theme ?? canvasAppConfig?.theme ?? {};
		updateAppProperty?.("theme", {
			...currentTheme,
			mode,
		});
	}
	function toggleLeftSidebar() {
		leftSidebarOpen = !leftSidebarOpen;
	}
	function toggleRightSidebar() {
		rightSidebarOpen = !rightSidebarOpen;
	}
	function handleWorkspaceChange(panel: EditorLeftPanel) {
		activeWorkspace = panel;
		activeAppSection = undefined;
		if (isMobile) {
			activeMobilePanel = panel;
			mobileSheetOpen = true;
		}
	}
	function handleAppSectionChange(section: EditorAppSection) {
		activeAppSection = section;
		store.setSelection(undefined);
		if (isMobile) {
			activeMobilePanel = "Properties";
			mobileSheetOpen = true;
		}
	}
	function handleMobilePanelChange(panel: MobileEditorPanel) {
		activeMobilePanel = panel;
		mobileSheetOpen = true;
		if (panel === "Outline" || panel === "Components") {
			activeWorkspace = panel;
			activeAppSection = undefined;
		}
	}
	function handleKeyDown(event: KeyboardEvent) {
		const target = event.target as HTMLElement;
		if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.getAttribute("contenteditable") === "true") return;
		if ((event.ctrlKey || event.metaKey) && event.key === "p") {
			event.preventDefault();
			togglePreview();
		}
		if ((event.ctrlKey || event.metaKey) && event.key === "z" && !event.shiftKey) {
			event.preventDefault();
			store.undo();
		}
		if (((event.ctrlKey || event.metaKey) && event.key === "z" && event.shiftKey) || ((event.ctrlKey || event.metaKey) && event.key === "y")) {
			event.preventDefault();
			store.redo();
		}
	}

	onMount(() => {
		updateViewportState();
		if (isBrowser) {
			window.addEventListener("keydown", handleKeyDown);
			window.addEventListener("resize", updateViewportState);
		}
	});

	onDestroy(() => {
		if (isBrowser) {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("resize", updateViewportState);
		}
	});
</script>

<div class={cn("canvas-editor canvas-editor-theme h-dvh w-full overflow-hidden", className)} data-mode={$store.mode}>
	{#if isMobile}
		<div class="relative h-full w-full overflow-hidden">
			<CanvasEditorSurface
				{document}
				components={$store.components as any}
				{providers}
				{providerData}
				{providerActions}
				{canvasAppConfig}
				mode={$store.mode as any}
				selection={$store.selection as any}
				onSelect={handleSelect as any}
				onHover={handleHover}
				onRequestEdit={handleRequestEdit as any}
				componentRegistry={registryMap}
				{componentCatalog}
				renderComponent={renderComponent as any}
				class="h-full"
			/>
			<CanvasEditorTrigger open={mobileSheetOpen} ontoggle={() => (mobileSheetOpen = !mobileSheetOpen)} />

			{#if mobileSheetOpen}
				<div class="pointer-events-none fixed inset-x-0 bottom-0 z-30 lg:hidden">
					<div class="pointer-events-auto mx-auto flex w-full max-w-2xl flex-col gap-3 px-3 pb-3">
						<div class="overflow-hidden rounded-[1.25rem] border border-[color:var(--editor-border)] bg-[color:var(--editor-panel)] text-[color:var(--editor-fg)] shadow-2xl shadow-black/10">
							{#if activeMobilePanel === "Outline" || activeMobilePanel === "Components"}
								<div class="max-h-[70vh] overflow-hidden">
									<div class="flex items-center justify-between border-b px-4 py-3 [border-color:var(--editor-border)]">
										<h2 class="text-sm font-semibold tracking-tight [color:var(--editor-fg)]">{activeMobilePanel}</h2>
										<button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium [border-color:var(--editor-border)] [background:var(--editor-panel-elevated)] [color:var(--editor-fg)]" onclick={() => (mobileSheetOpen = false)} aria-label="Close editor">×</button>
									</div>
									<CanvasEditorLeftSidebar
										components={$store.components as any}
										selection={$store.selection as any}
										{componentCatalog}
										activePanel={activeWorkspace}
										appName={appConfig?.name ?? "Canvas App"}
										onPanelChange={handleWorkspaceChange}
										onSelectAppSection={handleAppSectionChange}
										onOpenPages={() => (pagesDialogOpen = true)}
										onOpenEditorSettings={() => (editorSettingsOpen = true)}
										{leftSidebar}
										shell="body"
									/>
								</div>
							{:else}
								<div class="max-h-[70vh] overflow-hidden">
									<EditorSidebar
										components={$store.components as any}
										selection={activeAppSection ? undefined : ($store.selection as any)}
										{documentConfig}
										{documentEditorConfig}
										{componentCatalog}
										{editorConfig}
										{appConfig}
										{appEditorConfig}
										updateDocumentProperty={updateDocumentProperty}
										updateAppProperty={updateAppProperty}
										updateProperty={(path, property, value) => store.updateProperty(path, property, value)}
										mobile={true}
										showTabs={false}
										onClose={() => (mobileSheetOpen = false)}
										activePanel="Properties"
									/>
								</div>
							{/if}
						</div>
						<div class="grid grid-cols-3 gap-2 rounded-[1.1rem] border p-2 shadow-lg shadow-black/10 backdrop-blur [border-color:var(--editor-border)] [background:color-mix(in_oklab,var(--editor-panel),transparent_4%)]">
							{#each (["Outline", "Components", "Properties"] satisfies MobileEditorPanel[]) as panel}
								<button type="button" class={cn("inline-flex min-h-11 items-center justify-center rounded-xl px-2 text-xs font-medium transition", activeMobilePanel === panel ? "[background:var(--editor-accent)] [color:var(--editor-accent-foreground)]" : "bg-transparent [color:var(--editor-fg-muted)]")} onclick={() => handleMobilePanelChange(panel)}>{panel}</button>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<Sidebar.Provider class="h-full [background:var(--editor-bg)] [color:var(--editor-fg)]">
			<div class="flex h-full min-h-0 w-full overflow-hidden [background:var(--editor-bg)] [color:var(--editor-fg)]">
				<div class={cn("h-full min-h-0 overflow-hidden border-r transition-[width] duration-200 [border-color:var(--editor-border)] [background:var(--editor-panel)]", leftSidebarOpen ? "w-80" : "w-0 border-r-0")}>
					{#if leftSidebarOpen}
						<CanvasEditorLeftSidebar
							components={$store.components as any}
							selection={$store.selection as any}
							{componentCatalog}
							activePanel={activeWorkspace}
							appName={appConfig?.name ?? "Canvas App"}
							onPanelChange={handleWorkspaceChange}
							onSelectAppSection={handleAppSectionChange}
							onOpenPages={() => (pagesDialogOpen = true)}
							onOpenEditorSettings={() => (editorSettingsOpen = true)}
							{leftSidebar}
						/>
					{/if}
				</div>

				<Sidebar.Inset class="h-full min-w-0 overflow-hidden rounded-none border-x shadow-none [border-color:var(--editor-border)] [background:var(--editor-bg)] [color:var(--editor-fg)]">
					<CanvasEditorHeader
						title={documentTitle}
						preview={previewMode}
						themeMode={appThemeMode as any}
						onThemeModeChange={updateAppThemeMode}
						{canUndo}
						{canRedo}
						canSave={Boolean(onSave)}
						onToggleLeft={toggleLeftSidebar}
						onToggleRight={toggleRightSidebar}
						onUndo={() => store.undo()}
						onRedo={() => store.redo()}
						onTogglePreview={togglePreview}
						onSave={onSave}
					/>
					<div class="min-h-0 flex-1 overflow-auto [background:var(--editor-bg)]">
						<CanvasEditorSurface
							{document}
							components={$store.components as any}
							{providers}
							{providerData}
							{providerActions}
							{canvasAppConfig}
							mode={$store.mode as any}
							selection={$store.selection as any}
							onSelect={handleSelect as any}
							onHover={handleHover}
							onRequestEdit={handleRequestEdit as any}
							componentRegistry={registryMap}
							{componentCatalog}
							renderComponent={renderComponent as any}
							class="min-h-full"
						/>
					</div>
				</Sidebar.Inset>

				<div class={cn("h-full min-h-0 overflow-hidden border-l transition-[width] duration-200 [border-color:var(--editor-border)] [background:var(--editor-panel)]", rightSidebarOpen ? "w-96" : "w-0 border-l-0")}>
					{#if rightSidebarOpen}
						<CanvasEditorRightSidebar
							components={$store.components as any}
							selection={activeAppSection ? undefined : ($store.selection as any)}
							{documentConfig}
							{documentEditorConfig}
							{componentCatalog}
							{editorConfig}
							{appConfig}
							{appEditorConfig}
							updateDocumentProperty={updateDocumentProperty}
							updateAppProperty={updateAppProperty}
							updateProperty={(path, property, value) => store.updateProperty(path, property, value)}
							workspace={activeWorkspace}
							appSection={activeAppSection}
						/>
					{/if}
				</div>
			</div>
		</Sidebar.Provider>
	{/if}
	<CanvasEditorPagesDialog bind:open={pagesDialogOpen} />
	<EditorSettings bind:open={editorSettingsOpen} />
</div>
