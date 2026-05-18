<script lang="ts">
	import { CanvasEditor } from "$lib/base/editor/index.js";
	import { canvasComponentCatalog, type CanvasNode, type EditorComponent } from "$lib/index.js";

	const components: CanvasNode[] = [
		{
			id: "auth-editor-shell",
			type: "View",
			kind: "primitive",
			props: {
				display: "grid",
				minHeight: "100dvh",
				placeItems: "center",
				padding: 6,
				background:
					"linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(241,245,249,1) 100%)",
			},
			children: [
				{
					id: "auth-editor-card-shell",
					type: "View",
					kind: "primitive",
					props: {
						width: "100%",
						maxWidth: "24rem",
						maxHeight: "calc(100dvh - 7rem)",
						overflowY: "auto",
						padding: 2,
						placeSelf: "center",
					},
					children: [
						{
							id: "auth-editor-form",
							type: "Auth.Form",
							kind: "block",
							props: {
								title: "Login to your account",
								description: "Enter your email below to login to your account",
								socialProviders: [
									{ id: "google", label: "Continue with Google" },
									{ id: "github", label: "Continue with GitHub" },
								],
							},
						},
					],
				},
			],
		},
	];

	let appConfig = $state({
		name: "Auth Demo App",
		description: "Canvas editor root settings for the auth demo.",
		breakpointPreset: "tailwind",
	});

	const appEditorConfig: EditorComponent<Record<string, unknown>> = {
		label: "Canvas App",
		editorConfig: {
			fields: {
				name: { type: "text", label: "App Name" },
				description: { type: "text", label: "Description", multiline: true },
				breakpointPreset: {
					type: "select",
					label: "Breakpoint Preset",
					options: ["tailwind", "wide-screen"],
				},
			},
			groups: {
				general: {
					label: "App Settings",
					fields: ["name", "description", "breakpointPreset"],
				},
			},
		},
	};
</script>

<CanvasEditor
	{components}
	componentCatalog={canvasComponentCatalog}
	{appConfig}
	{appEditorConfig}
	updateAppProperty={(property, value) => {
		appConfig = {
			...appConfig,
			[property]: value,
		};
	}}
	sidebarMode="docked"
	class="auth-editor-page"
/>

<style>
	:global(html, body) {
		height: 100%;
	}

	:global(.auth-editor-page) {
		height: 100dvh;
	}
</style>
