<script lang="ts">
	import { Button } from "$lib/components/view-ui/button/index.js";
	import type { ComponentProps } from "svelte";

	let { ref = $bindable(null), children, style = "", ...restProps }: ComponentProps<typeof Button> & { children?: () => any } = $props();
</script>

<Button bind:ref data-slot="sidebar-group-action" variant="ghost" size="icon-sm" style={`position: absolute; top: 0.35rem; right: 0.35rem; ${style}`} {...restProps}>
	{@render children?.()}
</Button>
