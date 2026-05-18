<script lang="ts">
	import Pencil from "@lucide/svelte/icons/pencil";
	import { cn } from "$lib/utils.js";

	let {
		open = false,
		ontoggle,
		class: className = "",
	}: {
		open?: boolean;
		ontoggle?: () => void;
		class?: string;
	} = $props();
</script>

<button
	type="button"
	class={cn(
		"canvas-editor-trigger absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-slate-900 shadow-lg shadow-black/10 transition hover:bg-slate-50",
		className,
	)}
	onclick={() => ontoggle?.()}
	aria-label={open ? "Close editor" : "Open editor"}
	aria-pressed={open}
>
	<Pencil size={18} />
</button>
