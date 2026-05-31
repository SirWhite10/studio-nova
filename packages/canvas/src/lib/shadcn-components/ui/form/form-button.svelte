<script lang="ts">
	import { Button } from "$lib/shadcn-components/ui/button/index.js";
	import type { ButtonProps } from "$lib/shadcn-components/ui/button/button.svelte";

	let { ref = $bindable(null), ...restProps }: ButtonProps = $props();
</script>

<Button bind:ref type="submit" {...restProps} />
