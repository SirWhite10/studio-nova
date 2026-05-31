<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { SvelteMap } from "svelte/reactivity";
	import * as Sidebar from "$lib/components/view-ui/sidebar/index.js";
	import "./editor-theme.css";
	import { cn } from "$lib/utils.js";
	import { setEditorContext } from "./context.js";
	import CanvasEditorHeader from "./canvas-editor-header.svelte";
	import CanvasEditorLeftSidebar from "./canvas-editor-left-sidebar.svelte";
	import CanvasEditorMobileAppPanel from "./canvas-editor-mobile-app-panel.svelte";
	import CanvasEditorMobileMoreDialog from "./canvas-editor-mobile-more-dialog.svelte";
	import CanvasEditorMobileNav from "./canvas-editor-mobile-nav.svelte";
	import CanvasEditorPagesDialog from "./canvas-editor-pages-dialog.svelte";
	import CanvasEditorRightSidebar from "./canvas-editor-right-sidebar.svelte";
	import CanvasEditorSurface from "./canvas-editor-surface.svelte";
	import CanvasEditorAppPlaceholder from "./canvas-editor-app-placeholder.svelte";
	import EditorSidebar from "./EditorSidebar.svelte";
	import EditorSettings from "./editor-settings.svelte";
	import { createEditorStore } from "./store.js";
	import type {
		ComponentSelection,
		EditorAppSection,
		EditorLeftPanel,
		EditorProps,
	} from "./types.js";

	type MobileEditorPanel = "Add" | "Outline" | "Document" | "App" | "Selection";
	type MobileNavTab = "Add" | "Outline" | "Document" | "App";
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
	let compactMobileNav = $state(true);
	let leftSidebarOpen = $state(true);
	let rightSidebarOpen = $state(true);
	let mobileSheetOpen = $state(false);
	let mobileMoreOpen = $state(false);
	let activeWorkspace = $state<EditorLeftPanel>("Outline");
	let activeAppSection = $state<EditorAppSection | undefined>(undefined);
	let activeMobilePanel = $state<MobileEditorPanel>("Document");
	let pagesDialogOpen = $state(false);
	let editorSettingsOpen = $state(false);
	let lastIncomingComponents = $state("");
	let lastEmittedComponents = $state("");

	const documentTitle = $derived(appConfig?.name || "Document");
	const appThemeMode = $derived(canvasAppConfig?.theme?.mode ?? appConfig?.theme?.mode ?? "system");
	const previewMode = $derived($store.mode === "preview");
	const canUndo = $derived($store.historyIndex > 0);
	const canRedo = $derived($store.historyIndex < $store.history.length - 1);
	const activeMobileNavTab = $derived.by<MobileNavTab | undefined>(() => {
		if (activeMobilePanel === "Selection") return undefined;
		return activeMobilePanel;
	});
	const mobileSheetTitle = $derived.by(() => {
		if (activeMobilePanel === "Add") return "Add";
		if (activeMobilePanel === "Outline") return "Outline";
		if (activeMobilePanel === "Document") return "Document";
		if (activeMobilePanel === "App") {
			if (activeAppSection === "providers") return "Providers";
			if (activeAppSection === "theme") return "Theme";
			if (activeAppSection === "metadata") return "Metadata";
			return "App";
		}
		return $store.selection?.component?.type ?? "Edit";
	});
	const mobileSelectionLabel = $derived($store.selection?.component?.type ?? "Selected component");

	function updateViewportState() {
		if (!isBrowser) return;
		isMobile = window.innerWidth < 1024;
		compactMobileNav = window.innerWidth < 768;
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
		if (!selection && isMobile && activeMobilePanel === "Selection") {
			mobileSheetOpen = false;
			activeMobilePanel = "Document";
		}
	}

	function handleRequestEdit(selection: ComponentSelection) {
		store.setSelection(selection);
		activeAppSection = undefined;
		activeMobilePanel = "Selection";
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
			activeMobilePanel = panel === "Components" ? "Add" : "Outline";
			mobileSheetOpen = true;
		}
	}
	function handleAppSectionChange(section: EditorAppSection) {
		activeAppSection = section;
		store.setSelection(undefined);
		if (isMobile) {
			activeMobilePanel = "App";
			mobileSheetOpen = true;
		}
	}
	function openMobilePanel(panel: MobileNavTab) {
		activeAppSection = panel === "App" ? activeAppSection ?? "app-settings" : undefined;
		activeMobilePanel = panel;
		mobileSheetOpen = true;
		if (panel === "Add") activeWorkspace = "Components";
		if (panel === "Outline") activeWorkspace = "Outline";
	}
	function openMobileDocument() {
		activeAppSection = undefined;
		activeMobilePanel = "Document";
		mobileSheetOpen = true;
	}
	function openMobileApp() {
		activeAppSection = activeAppSection && activeAppSection !== "seo" ? activeAppSection : "app-settings";
		activeMobilePanel = "App";
		mobileSheetOpen = true;
	}
	function closeMobileSheet() {
		mobileSheetOpen = false;
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
				mobile={true}
				class="h-full"
			/>

			{#if $store.selection}
				<div class="pointer-events-none fixed inset-x-0 bottom-20 z-30 px-3 lg:hidden">
					<div class="pointer-events-auto mx-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border px-3 py-2 shadow-lg backdrop-blur [border-color:var(--editor-border)] [background:color-mix(in_oklab,var(--editor-panel),transparent_4%)]">
						<div class="min-w-0">
							<div class="truncate text-[0.7rem] font-semibold uppercase tracking-[0.12em] [color:var(--editor-fg-muted)]">Selected</div>
							<div class="truncate text-sm font-semibold [color:var(--editor-fg)]">{mobileSelectionLabel}</div>
						</div>
						<div class="flex items-center gap-2">
							<button type="button" class="inline-flex min-h-11 items-center justify-center rounded-xl border px-3 text-sm font-medium [border-color:var(--editor-border)] [background:var(--editor-panel-elevated)] [color:var(--editor-fg)]" onclick={() => handleRequestEdit($store.selection as ComponentSelection)}>Edit</button>
							<button type="button" class="inline-flex min-h-11 items-center justify-center rounded-xl border px-3 text-sm font-medium [border-color:var(--editor-border)] [background:var(--editor-panel-elevated)] [color:var(--editor-fg)]" onclick={() => store.setSelection(undefined)}>Done</button>
						</div>
					</div>
				</div>
			{/if}

			{#if mobileSheetOpen}
				<div class="pointer-events-none fixed inset-x-0 bottom-[5.5rem] z-30 lg:hidden">
					<div class="pointer-events-auto mx-auto flex w-full max-w-2xl flex-col gap-3 px-3 pb-3">
						<div class="overflow-hidden rounded-[1.35rem] border border-[color:var(--editor-border)] bg-[color:var(--editor-panel)] text-[color:var(--editor-fg)] shadow-2xl shadow-black/10">
							<div class="max-h-[72vh] overflow-hidden">
								<div class="flex items-center justify-between border-b px-4 py-3 [border-color:var(--editor-border)]">
									<h2 class="text-sm font-semibold tracking-tight [color:var(--editor-fg)]">{mobileSheetTitle}</h2>
									<button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium [border-color:var(--editor-border)] [background:var(--editor-panel-elevated)] [color:var(--editor-fg)]" onclick={closeMobileSheet} aria-label="Close editor">×</button>
								</div>

								<div class="max-h-[calc(72vh-3.75rem)] overflow-auto p-4">
									{#if activeMobilePanel === "Add" || activeMobilePanel === "Outline"}
										<CanvasEditorLeftSidebar
											components={$store.components as any}
											selection={$store.selection as any}
											{componentCatalog}
											activePanel={activeMobilePanel === "Add" ? "Components" : "Outline"}
											appName={appConfig?.name ?? "Canvas App"}
											onPanelChange={handleWorkspaceChange}
											onSelectAppSection={handleAppSectionChange}
											onOpenPages={() => (pagesDialogOpen = true)}
											onOpenEditorSettings={() => (editorSettingsOpen = true)}
											{leftSidebar}
											shell="body"
										/>
									{:else if activeMobilePanel === "Document" || activeMobilePanel === "Selection"}
										<EditorSidebar
											components={$store.components as any}
											selection={activeMobilePanel === "Selection" && !activeAppSection ? ($store.selection as any) : undefined}
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
											onClose={closeMobileSheet}
											activePanel="Properties"
										/>
									{:else if activeMobilePanel === "App"}
										<CanvasEditorMobileAppPanel
											appName={appConfig?.name ?? "Canvas App"}
											{appConfig}
											{appEditorConfig}
											updateAppProperty={updateAppProperty}
											appSection={activeAppSection && activeAppSection !== "seo" ? activeAppSection : "app-settings"}
											onSelectSection={(section) => handleAppSectionChange(section as EditorAppSection)}
											onOpenPages={() => (pagesDialogOpen = true)}
										/>
										{#if activeAppSection === "seo"}
											<div class="mt-4">
												<CanvasEditorAppPlaceholder section="metadata" />
											</div>
										{/if}
									{/if}
								</div>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<div class="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-3 lg:hidden">
				<div class="pointer-events-auto mx-auto w-full max-w-2xl">
					<CanvasEditorMobileNav
						activeTab={activeMobileNavTab}
						showLabels={!compactMobileNav}
						onSelect={openMobilePanel}
						onOpenMore={() => (mobileMoreOpen = true)}
					/>
				</div>
			</div>
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
	<CanvasEditorMobileMoreDialog
		bind:open={mobileMoreOpen}
		appName={appConfig?.name ?? "Canvas App"}
		{previewMode}
		{canUndo}
		{canRedo}
		canSave={Boolean(onSave)}
		onTogglePreview={togglePreview}
		onUndo={() => store.undo()}
		onRedo={() => store.redo()}
		onSave={onSave}
		onOpenDocument={openMobileDocument}
		onOpenApp={openMobileApp}
		onOpenPages={() => (pagesDialogOpen = true)}
		onOpenEditorSettings={() => (editorSettingsOpen = true)}
	/>
</div>
