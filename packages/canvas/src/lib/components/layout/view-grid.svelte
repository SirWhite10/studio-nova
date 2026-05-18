<script lang="ts">
	import { View, type ViewProps } from "$lib/base/view/index.js";

	let {
		columns = "1fr",
		rows,
		autoFlow,
		gap = 0,
		children,
		...restProps
	}: ViewProps & {
		columns?: string;
		rows?: string;
		autoFlow?: string;
	} = $props();
</script>

<View
	display="grid"
	gridTemplateColumns={columns}
	gridTemplateRows={rows}
	gridAutoFlow={autoFlow}
	{gap}
	{...restProps}
>
	{@render children?.()}
</View>
