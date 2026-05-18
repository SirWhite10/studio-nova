<script lang="ts">
	import { CanvasEditor, canvasComponentCatalog, type CanvasAppConfig, type CanvasNode, type EditorComponent } from "$lib/index.js";
	import { landingCanvasDocument } from "./document.js";

	let components = $state<CanvasNode[]>(structuredClone(landingCanvasDocument.components ?? []));
	let appConfig = $state({
		name: "Landing Canvas",
		description: "Minimal Canvas editor overlay for the landing demo.",
		defaultResponsiveMode: "viewport",
		splashEnabled: false,
		splashTitle: "Landing Canvas",
		splashDescription: "Reference-backed components for modern app surfaces.",
	});

	const canvasAppConfig = $derived<CanvasAppConfig>({
		responsive: {
			defaultMode: appConfig.defaultResponsiveMode as "viewport" | "container",
			breakpoints: {
				viewport: {
					md: { minWidth: 720, label: "MD" },
					lg: { minWidth: 1040, label: "LG" },
				},
			},
		},
		splash: {
			enabled: appConfig.splashEnabled,
			title: appConfig.splashTitle,
			description: appConfig.splashDescription,
		},
	});

	const appEditorConfig: EditorComponent<Record<string, unknown>> = {
		label: "Canvas App",
		editorConfig: {
			fields: {
				name: { type: "text", label: "Name" },
				description: { type: "text", label: "Description", multiline: true },
				defaultResponsiveMode: {
					type: "select",
					label: "Responsive Mode",
					options: ["viewport", "container"],
				},
				splashEnabled: { type: "boolean", label: "Enable Splash" },
				splashTitle: { type: "text", label: "Splash Title" },
				splashDescription: {
					type: "text",
					label: "Splash Description",
					multiline: true,
				},
			},
			groups: {
				general: {
					label: "App Settings",
					fields: ["name", "description", "defaultResponsiveMode"],
				},
				splash: {
					label: "Splash",
					fields: ["splashEnabled", "splashTitle", "splashDescription"],
				},
			},
		},
	};
</script>

<svelte:head>
	<title>Landing Canvas</title>
	<meta
		name="description"
		content="Canvas-rendered hero preset matching the landing page layout through granular block slots."
	/>
</svelte:head>

<CanvasEditor
	document={landingCanvasDocument}
	{components}
	componentCatalog={canvasComponentCatalog}
	canvasAppConfig={canvasAppConfig}
	{appConfig}
	{appEditorConfig}
	onChange={(nextComponents) => {
		components = nextComponents;
	}}
	updateAppProperty={(property, value) => {
		appConfig = {
			...appConfig,
			[property]: value,
		};
	}}
	class="min-h-dvh bg-background text-foreground"
/>
