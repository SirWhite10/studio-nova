<script lang="ts">
	import type { Snippet } from "svelte";
	import { View } from "$lib/base/view/index.js";
	let { ref = $bindable(null), children, class: className = "", style = "", ...restProps }: { ref?: HTMLElement | null; children?: Snippet; class?: string; style?: string; [key: string]: any } = $props();
</script>
<View bind:ref data-slot="card-footer" class={className} display="flex" alignItems="center" paddingLeft="1.5rem" paddingRight="1.5rem" style={style} {...restProps}>{@render children?.()}</View>
