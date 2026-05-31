<script lang="ts">
	import { ToggleGroup as ToggleGroupPrimitive } from "bits-ui";
	import { Button } from "$lib/components/view-ui/button/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import { getToggleGroupCtx } from "./context.svelte.js";

	let {
		ref = $bindable(null),
		value = $bindable(),
		size,
		variant,
		children,
		style = "",
		...restProps
	}: ToggleGroupPrimitive.ItemProps & {
		size?: "default" | "sm" | "lg";
		variant?: "default" | "outline";
		children?: () => any;
	} = $props();

	const ctx = getToggleGroupCtx();
	const isOutline = $derived((ctx?.variant || variant || "default") === "outline");
	const isCollapsed = $derived((ctx?.spacing ?? spacing ?? 0) === 0);
</script>

<ToggleGroupPrimitive.Item bind:ref {value} {...restProps}>
	{#snippet child({ props, state })}
		<Button
			{...props}
			data-slot="toggle-group-item"
			variant={ctx?.variant || variant || "default"}
			size={(ctx?.size || size || "default") === "default" ? "sm" : (ctx?.size || size || "sm")}
			style={[
				state === "on" ? `background: ${canvasTheme.colors.muted};` : "",
				isCollapsed ? "border-radius: 0;" : "",
				isCollapsed && isOutline ? "box-shadow: none;" : "",
				isCollapsed && isOutline ? "border-left-width: 0;" : "",
				isCollapsed && isOutline ? "padding-inline: 0.5rem;" : "",
				style,
			].join(" ")}
		>
			{@render children?.()}
		</Button>
	{/snippet}
</ToggleGroupPrimitive.Item>

<style>
	:global([data-slot="toggle-group-item"] svg:not([data-size])) {
		width: 1rem;
		height: 1rem;
		pointer-events: none;
		flex-shrink: 0;
	}
</style>
