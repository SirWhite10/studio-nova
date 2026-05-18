<script lang="ts">
	import { View, type ViewProps } from "$lib/base/view/index.js";

	type FlexDirection = NonNullable<ViewProps["flexDirection"]>;
	type FlexAlign = NonNullable<ViewProps["alignItems"]>;
	type FlexJustify = NonNullable<ViewProps["justifyContent"]>;

	let {
		direction = "row",
		align = "stretch",
		justify = "start",
		gap = 0,
		children,
		...restProps
	}: ViewProps & {
		direction?: FlexDirection;
		align?: FlexAlign;
		justify?: FlexJustify;
	} = $props();
</script>

<View
	display="flex"
	flexDirection={direction}
	alignItems={align}
	justifyContent={justify}
	{gap}
	{...restProps}
>
	{@render children?.()}
</View>
