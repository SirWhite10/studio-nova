<script lang="ts">
	import type { Snippet } from "svelte";
	import CardContent from "../card/card-content.svelte";

	let { children, style = "", ...restProps }: { children?: Snippet; style?: string; [key: string]: unknown } = $props();
</script>

<CardContent style={style} {...restProps}>
	{@render children?.()}
</CardContent>
