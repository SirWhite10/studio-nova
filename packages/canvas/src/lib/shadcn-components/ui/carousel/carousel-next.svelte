<script lang="ts">
	import type { WithoutChildren } from "bits-ui";
	import { getEmblaContext } from "./context.js";
	import { cn } from "$lib/shadcn-components/utils.js";
	import { Button } from "$lib/shadcn-components/ui/button/index.js";
	import type { ButtonProps } from "$lib/shadcn-components/ui/button/button.svelte";
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	let {
		ref = $bindable(null),
		class: className,
		variant = "outline",
		size = "icon-sm",
		...restProps
	}: WithoutChildren<ButtonProps> = $props();

	const emblaCtx = getEmblaContext("<Carousel.Next/>");
</script>

<Button
	data-slot="carousel-next"
	{variant}
	{size}
	aria-disabled={!emblaCtx.canScrollNext}
	disabled={!emblaCtx.canScrollNext}
	class={cn(
		"rounded-full absolute touch-manipulation",
		emblaCtx.orientation === "horizontal"
			? "-end-12 top-1/2 -translate-y-1/2"
			: "start-1/2 -bottom-12 -translate-x-1/2 rotate-90",
		className
	)}
	onclick={emblaCtx.scrollNext}
	onkeydown={emblaCtx.handleKeyDown}
	bind:ref
	{...restProps}
>
	<ChevronRightIcon  />
	<span class="sr-only">Next slide</span>
</Button>
