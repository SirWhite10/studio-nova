<script lang="ts">
	import * as Sidebar from "$lib/shadcn-components/ui/sidebar/index.js";
	import { cn } from "$lib/utils.js";
	import CanvasEditorAppPlaceholder from "./canvas-editor-app-placeholder.svelte";
	import CanvasEditorInspector from "./canvas-editor-inspector.svelte";
	import type { EditorAppSection, EditorLeftPanel, EditorSidebarProps } from "./types.js";

	let {
		components = [],
		selection = undefined,
		documentConfig = {},
		documentEditorConfig = undefined,
		componentCatalog = {},
		editorConfig = {},
		appConfig = {},
		appEditorConfig = undefined,
		updateProperty = undefined,
		updateDocumentProperty = undefined,
		updateAppProperty = undefined,
		workspace = "Outline",
		appSection = undefined,
		class: className = "",
	}: EditorSidebarProps & { workspace?: EditorLeftPanel; appSection?: EditorAppSection } = $props();

	const title = $derived.by(() => {
		if (appSection === "app-settings") return "App Settings";
		if (appSection === "theme") return "Theme";
		if (appSection === "providers") return "Providers";
		if (appSection === "seo") return "SEO";
		if (appSection === "metadata") return "Metadata";
		return selection ? selection.component.type : "Document";
	});
</script>

<div class={cn("canvas-editor-right-sidebar-root flex h-full min-h-0 w-full shrink-0 flex-col bg-background/95 text-foreground shadow-[inset_1px_0_0_var(--border)]", className)}>
	<Sidebar.Header class="border-b border-border bg-background/90 px-4 py-3">
		<h2 class="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
	</Sidebar.Header>
	<Sidebar.Content class="min-h-0 p-0">
		<Sidebar.Group class="min-h-0 p-4">
			{#if appSection === "app-settings"}
				<CanvasEditorInspector
					{components}
					selection={undefined}
					{documentConfig}
					{documentEditorConfig}
					{componentCatalog}
					{editorConfig}
					{appConfig}
					{appEditorConfig}
					{updateProperty}
					{updateDocumentProperty}
					{updateAppProperty}
					mode="app"
				/>
			{:else if appSection}
				<CanvasEditorAppPlaceholder section={appSection} />
			{:else}
				<CanvasEditorInspector
					{components}
					{selection}
					{documentConfig}
					{documentEditorConfig}
					{componentCatalog}
					{editorConfig}
					{appConfig}
					{appEditorConfig}
					{updateProperty}
					{updateDocumentProperty}
					{updateAppProperty}
					mode="properties"
				/>
			{/if}
		</Sidebar.Group>
	</Sidebar.Content>
</div>
