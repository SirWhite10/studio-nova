<script lang="ts">
	import type { Snippet } from "svelte";
	import { View } from "$lib/base/view/index.js";
	let { ref = $bindable(null), children, class: className = "", style = "", ...restProps }: { ref?: HTMLElement | null; children?: Snippet; class?: string; style?: string; [key: string]: any } = $props();
</script>
<View bind:ref data-slot="field-separator" class={className} style={`height:1px; width:100%; background:var(--border); ${style}`} {...restProps}>{@render children?.()}</View>
