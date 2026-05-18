<script lang="ts">
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import { Select as SelectPrimitive } from "bits-ui";
	import { Button } from "$lib/components/view-ui/button/index.js";

	let {
		ref = $bindable(null),
		children,
		size = "default",
		style = "",
		...restProps
	}: SelectPrimitive.TriggerProps & {
		size?: "sm" | "default";
		children?: () => any;
	} = $props();
</script>

<SelectPrimitive.Trigger bind:ref {...restProps}>
	{#snippet child({ props })}
		<Button
			{...props}
			data-slot="select-trigger"
			variant="outline"
			size={size === "sm" ? "sm" : "default"}
			style={`width: fit-content; justify-content: space-between; gap: 0.5rem; ${style}`}
		>
			{@render children?.()}
			<ChevronDownIcon size={16} />
		</Button>
	{/snippet}
</SelectPrimitive.Trigger>
