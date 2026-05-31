<script lang="ts">
	import { Input } from "$lib/components/view-ui/input/index.js";
	import type { ComponentProps } from "svelte";

	let { ref = $bindable(null), style = "", ...restProps }: ComponentProps<typeof Input> = $props();
</script>

<Input bind:ref data-slot="sidebar-input" style={`height: 2rem; font-size: 0.8125rem; ${style}`} {...restProps} />
