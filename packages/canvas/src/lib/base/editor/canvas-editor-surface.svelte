<script lang="ts">
	import EditorCanvas from "./EditorCanvas.svelte";
	import type { EditorCanvasProps } from "./types.js";

	let props: EditorCanvasProps = $props();
</script>

<EditorCanvas {...props} />
