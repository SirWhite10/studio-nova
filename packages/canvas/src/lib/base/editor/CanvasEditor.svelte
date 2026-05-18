<script lang="ts">
	import StudioEditor from "./StudioEditor.svelte";
	import type { EditorProps } from "./types.js";

	let props: EditorProps = $props();
</script>

<StudioEditor {...props} />
