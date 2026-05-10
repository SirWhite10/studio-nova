<script lang="ts">
	import SearchIcon from "@lucide/svelte/icons/search";
	import CommandIcon from "@lucide/svelte/icons/command";
	import ArrowUpRightIcon from "@lucide/svelte/icons/arrow-up-right";
	import * as Command from "$lib/components/ui/command/index.js";
	import StudioIcon from "$lib/components/studios/studio-icon.svelte";
	import { goto } from "$app/navigation";
	import { cn } from "$lib/utils";
	import type { StudioShellSearchResult } from "$lib/studios/types";

	interface Props {
		selectedStudioId?: string | null;
		placeholder?: string;
		class?: string;
	}

	let {
		selectedStudioId = null,
		placeholder = "Search Nova",
		class: className = "",
	}: Props = $props();

	let open = $state(false);
	let query = $state("");
	let loading = $state(false);
	let results = $state.raw<StudioShellSearchResult[]>([]);

	function onShortcut(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
			event.preventDefault();
			open = true;
		}
	}

	async function openResult(result: StudioShellSearchResult) {
		open = false;
		query = "";
		results = [];
		await goto(result.href);
	}

	$effect(() => {
		if (!open) return;
		const trimmed = query.trim();
		if (!trimmed) {
			results = [];
			loading = false;
			return;
		}

		loading = true;
		const controller = new AbortController();
		const timer = window.setTimeout(async () => {
			try {
				const params = new URLSearchParams({ q: trimmed, limit: "10" });
				if (selectedStudioId) params.set("studioId", selectedStudioId);
				const res = await fetch(`/api/app/search?${params}`, { signal: controller.signal });
				if (!res.ok) {
					results = [];
					return;
				}
				const payload = await res.json();
				results = payload.results ?? [];
			} catch (error) {
				if ((error as Error).name !== "AbortError") {
					results = [];
				}
			} finally {
				loading = false;
			}
		}, 140);

		return () => {
			controller.abort();
			window.clearTimeout(timer);
			loading = false;
		};
	});
</script>

<svelte:window onkeydown={onShortcut} />

<button
	type="button"
	onclick={() => (open = true)}
	class={cn(
		"studio-shell-search group flex h-10 w-full items-center gap-2 rounded-xl border border-sidebar-border/70 bg-transparent px-3 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/10 hover:text-sidebar-foreground data-[collapsed=true]:justify-center group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:px-2",
		className,
	)}
>
	<SearchIcon class="size-4 shrink-0" />
	<span class="truncate group-data-[collapsible=icon]:hidden">{placeholder}</span>
	<span class="ms-auto hidden items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden sm:flex">
		<CommandIcon class="size-3" />
		K
	</span>
</button>

<Command.Dialog bind:open title="Search Nova" description="Search Studios, chats, integrations, and workspace surfaces." class="max-w-2xl">
	<Command.Input bind:value={query} placeholder={placeholder} />
	<Command.List class="max-h-[24rem] overflow-auto">
		{#if loading}
			<Command.Loading>Searching…</Command.Loading>
		{:else if !query.trim()}
			<Command.Empty>Type to search Nova.</Command.Empty>
		{:else if results.length === 0}
			<Command.Empty>No results found.</Command.Empty>
		{:else}
			<Command.Group heading="Results">
				{#each results as result (result.id)}
					<Command.Item value={result.title} onSelect={() => openResult(result)}>
						<div class="flex min-w-0 flex-1 items-center gap-3">
							<div class="rounded-lg bg-muted p-2 text-foreground">
								<StudioIcon name={result.type === "chat" ? "message-square" : result.type === "integration" ? "plug-zap" : result.type === "workspace" ? "blocks" : "waypoints"} class="size-3.5" />
							</div>
							<div class="min-w-0">
								<p class="truncate font-medium">{result.title}</p>
								<p class="truncate text-xs text-muted-foreground">{result.subtitle}</p>
							</div>
						</div>
						<div class="ml-3 flex items-center gap-2 text-xs text-muted-foreground">
							<span>{result.section}</span>
							<ArrowUpRightIcon class="size-3.5" />
						</div>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}
	</Command.List>
</Command.Dialog>
