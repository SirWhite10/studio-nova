<script lang="ts">
	import { Canvas, canvasComponentCatalog } from "$lib/index.js";
	import { landingCanvasDocument } from "./document.js";
</script>

<svelte:head>
	<title>Landing Canvas</title>
	<meta
		name="description"
		content="Canvas-rendered hero preset matching the landing page layout through granular block slots."
	/>
</svelte:head>

<div class="min-h-dvh bg-background text-foreground">
	<div class="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 py-6 md:px-10 md:py-8">
		<Canvas document={landingCanvasDocument} componentCatalog={canvasComponentCatalog} />
	</div>
</div>
