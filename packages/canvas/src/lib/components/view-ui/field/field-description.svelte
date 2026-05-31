<script lang="ts">
	import type { Snippet } from "svelte";
	import { View } from "$lib/base/view/index.js";
	let { ref = $bindable(null), children, class: className = "", style = "", ...restProps }: { ref?: HTMLElement | null; children?: Snippet; class?: string; style?: string; [key: string]: any } = $props();
</script>
<View bind:ref data-slot="field-description" class={className} style={`color:var(--muted-foreground); font-size:0.875rem; line-height:1.25rem; ${style}`} {...restProps}>{@render children?.()}</View>
