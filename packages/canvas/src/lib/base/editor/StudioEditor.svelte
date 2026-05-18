<script lang="ts">
	import CanvasEditor from "./CanvasEditor.svelte";
	import type { EditorProps } from "./types.js";

	let props: EditorProps = $props();
</script>

<CanvasEditor {...props} />
