<script lang="ts">
	import {
		CanvasEditor,
		canvasComponentCatalog,
		defaultCanvasTheme,
		type CanvasAppConfig,
		type CanvasNode,
		type EditorComponent,
	} from "$lib/index.js";
	import { landingCanvasDocument } from "./document.js";

	const themeColorField = (label: string) => ({ type: "color", label, format: "oklch" as const });
	const textField = (label: string) => ({ type: "text", label });

	const themeVariableFields = {
		background: themeColorField("Background"),
		foreground: themeColorField("Foreground"),
		card: themeColorField("Card"),
		"card-foreground": themeColorField("Card Foreground"),
		popover: themeColorField("Popover"),
		"popover-foreground": themeColorField("Popover Foreground"),
		primary: themeColorField("Primary"),
		"primary-foreground": themeColorField("Primary Foreground"),
		secondary: themeColorField("Secondary"),
		"secondary-foreground": themeColorField("Secondary Foreground"),
		muted: themeColorField("Muted"),
		"muted-foreground": themeColorField("Muted Foreground"),
		accent: themeColorField("Accent"),
		"accent-foreground": themeColorField("Accent Foreground"),
		destructive: themeColorField("Destructive"),
		"destructive-foreground": themeColorField("Destructive Foreground"),
		border: themeColorField("Border"),
		input: themeColorField("Input"),
		ring: themeColorField("Ring"),
		"chart-1": themeColorField("Chart 1"),
		"chart-2": themeColorField("Chart 2"),
		"chart-3": themeColorField("Chart 3"),
		"chart-4": themeColorField("Chart 4"),
		"chart-5": themeColorField("Chart 5"),
		radius: textField("Radius"),
		sidebar: themeColorField("Sidebar"),
		"sidebar-foreground": themeColorField("Sidebar Foreground"),
		"sidebar-primary": themeColorField("Sidebar Primary"),
		"sidebar-primary-foreground": themeColorField("Sidebar Primary Foreground"),
		"sidebar-accent": themeColorField("Sidebar Accent"),
		"sidebar-accent-foreground": themeColorField("Sidebar Accent Foreground"),
		"sidebar-border": themeColorField("Sidebar Border"),
		"sidebar-ring": themeColorField("Sidebar Ring"),
		spacing: textField("Spacing"),
		"font-sans": textField("Font Sans"),
		"font-serif": textField("Font Serif"),
		"font-mono": textField("Font Mono"),
	} as const;

	let components = $state<CanvasNode[]>(structuredClone(landingCanvasDocument.components ?? []));
	let documentConfig = $state(structuredClone(landingCanvasDocument.props ?? {}));
	let appConfig = $state({
		name: "Landing Canvas",
		description: "Minimal Canvas editor overlay for the landing demo.",
		defaultResponsiveMode: "viewport",
		splashEnabled: false,
		splashTitle: "Landing Canvas",
		splashDescription: "Reference-backed components for modern app surfaces.",
		theme: structuredClone(defaultCanvasTheme),
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
		theme: appConfig.theme,
	});

	const documentEditorConfig: EditorComponent<Record<string, unknown>> = {
		label: "Canvas Document",
		editorConfig: {
			fields: {
				class: { type: "text", label: "Class" },
				style: { type: "text", label: "Style", multiline: true },
			},
			groups: {
				layout: {
					label: "Document Layout",
					fields: ["class", "style"],
				},
			},
		},
	};

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
				theme: {
					type: "object",
					label: "Theme",
					fields: {
						mode: {
							type: "select",
							label: "Color Mode",
							options: ["system", "light", "dark"],
						},
						defaultMode: {
							type: "select",
							label: "System Fallback",
							options: ["light", "dark"],
						},
						light: {
							type: "object",
							label: "Light Theme",
							fields: themeVariableFields as any,
						},
						dark: {
							type: "object",
							label: "Dark Theme",
							fields: themeVariableFields as any,
						},
					},
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
				theme: {
					label: "Theme",
					fields: ["theme"],
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
	document={{ ...landingCanvasDocument, props: documentConfig }}
	{components}
	componentCatalog={canvasComponentCatalog}
	canvasAppConfig={canvasAppConfig}
	{documentConfig}
	{documentEditorConfig}
	{appConfig}
	{appEditorConfig}
	onChange={(nextComponents) => {
		components = nextComponents;
	}}
	updateDocumentProperty={(property, value) => {
		documentConfig = {
			...documentConfig,
			[property]: value,
		};
	}}
	updateAppProperty={(property, value) => {
		appConfig = {
			...appConfig,
			[property]: value,
		};
	}}
	class="min-h-dvh bg-background text-foreground"
/>
