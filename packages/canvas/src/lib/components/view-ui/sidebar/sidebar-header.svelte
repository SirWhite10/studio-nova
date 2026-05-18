<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import type { HTMLAttributes } from "svelte/elements";

	let { ref = $bindable(null), children, style = "", ...restProps }: HTMLAttributes<HTMLElement> & { children?: () => any } = $props();
</script>

<View
	as="div"
	bind:ref
	data-slot="sidebar-header"
	display="flex"
	flexDirection="column"
	gap={2}
	padding={2}
	style={style}
	{...restProps}
>
	{@render children?.()}
</View>
