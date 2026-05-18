<script lang="ts">
	import { CanvasApp, canvasComponentCatalog, type CanvasAppConfig } from "$lib/index.js";
	import { landingCanvasDocument } from "./document.js";

	const appConfig: CanvasAppConfig = {
		responsive: {
			defaultMode: "viewport",
			breakpoints: {
				viewport: {
					md: { minWidth: 720, label: "MD" },
					lg: { minWidth: 1040, label: "LG" },
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

<CanvasApp document={landingCanvasDocument} componentCatalog={canvasComponentCatalog} config={appConfig} class="min-h-dvh bg-background text-foreground" />
