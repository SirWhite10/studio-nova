<script lang="ts">
	import * as Sidebar from "$lib/shadcn-components/ui/sidebar/index.js";
	import { cn } from "$lib/utils.js";
	import CanvasEditorInspector from "./canvas-editor-inspector.svelte";
	import type { EditorLeftPanel, EditorSidebarProps } from "./types.js";

	let {
		components = [],
		selection = undefined,
		documentSelection = undefined,
		componentCatalog = {},
		editorConfig = {},
		appConfig = {},
		appEditorConfig = undefined,
		updateProperty = undefined,
		updateAppProperty = undefined,
		workspace = "Outline",
		class: className = "",
	}: EditorSidebarProps & { workspace?: EditorLeftPanel } = $props();

	const title = $derived(workspace === "Settings" ? "Settings" : selection ? selection.component.type : "Document");
</script>

<div class={cn("canvas-editor-right-sidebar-root flex h-full min-h-0 w-full shrink-0 flex-col bg-slate-50/95 shadow-[inset_1px_0_0_rgba(15,23,42,0.08)]", className)}>
	<Sidebar.Header class="border-b border-black/10 bg-slate-50/90 px-4 py-3">
		<h2 class="text-sm font-semibold tracking-tight text-slate-900">{title}</h2>
	</Sidebar.Header>
	<Sidebar.Content class="min-h-0 p-0">
		<Sidebar.Group class="min-h-0 p-4">
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
				mode={workspace === "Settings" ? "app" : "properties"}
			/>
		</Sidebar.Group>
	</Sidebar.Content>
</div>
