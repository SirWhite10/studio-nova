<script lang="ts">
	import type { Snippet } from "svelte";
	import { View } from "$lib/base/view/index.js";
	let { ref = $bindable(null), children, class: className = "", style = "", ...restProps }: { ref?: HTMLElement | null; children?: Snippet; class?: string; style?: string; [key: string]: any } = $props();
</script>
<View bind:ref data-slot="field-set" class={className} style={`display:flex; flex-direction:column; gap:1rem; border:0; padding:0; margin:0; ${style}`} {...restProps}>{@render children?.()}</View>
