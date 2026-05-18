<script lang="ts">
	import { StudioEditor } from "$lib/base/editor/index.js";
	import { canvasComponentCatalog, type CanvasNode } from "$lib/index.js";

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
</script>

<StudioEditor
	{components}
	componentCatalog={canvasComponentCatalog}
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
