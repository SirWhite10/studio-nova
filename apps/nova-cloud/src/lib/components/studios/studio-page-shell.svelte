<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";

	interface Props {
		class?: string;
		containerClass?: string;
		children?: Snippet;
	}

	let {
		class: className = "",
		containerClass = "max-w-7xl gap-6",
		children,
	}: Props = $props();
</script>

<div class={cn("studio-shell-page", className)}>
	<div class={cn("studio-shell-page__inner", containerClass)}>
		{@render children?.()}
	</div>
</div>
