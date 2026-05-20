<script lang="ts">
	import { ModeWatcher } from "mode-watcher";
	import "../app.css";

	let { children }: { children?: () => any } = $props();
</script>

<ModeWatcher />
{@render children?.()}
