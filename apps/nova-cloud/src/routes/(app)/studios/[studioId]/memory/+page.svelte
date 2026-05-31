<script lang="ts">
	import BrainIcon from '@lucide/svelte/icons/brain';
	import SearchIcon from '@lucide/svelte/icons/search';
	import StudioPageShell from '$lib/components/studios/studio-page-shell.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';

	let { data }: { data: any } = $props();

	const searchResults = $derived((data.searchedMemories ?? []).map((entry: any) => entry.entry));
	const hasQuery = $derived((data.query ?? '').length > 0);

	function formatTimestamp(value?: number | null) {
		if (!value) return 'Unknown time';
		return new Date(value).toLocaleString();
	}
</script>

<StudioPageShell
	class="bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.12),transparent_28%)]"
	containerClass="max-w-7xl"
>
	<div class="space-y-6">
		<section class="rounded-[2.25rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur sm:p-8">
			<div class="space-y-4">
				<div class="flex flex-wrap items-center gap-2">
					<Badge class="rounded-full bg-muted px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Memory</Badge>
					<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">{data.recentMemories.length} recent items</Badge>
				</div>
				<div>
					<h1 class="text-3xl font-semibold tracking-tight sm:text-5xl">{data.studio?.name ?? 'Studio'} memory</h1>
					<p class="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
						Inspect long-term memory outside chat, search what Nova has stored, and verify that important user and Studio context is actually durable.
					</p>
				</div>

				<form method="GET" class="flex flex-col gap-3 sm:flex-row">
					<div class="relative min-w-0 flex-1">
						<SearchIcon class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input name="q" value={data.query} placeholder="Search saved memory" class="h-11 rounded-full border-border/70 pl-9" />
					</div>
					<button type="submit" class="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">
						Search
					</button>
				</form>
			</div>
		</section>

		{#if hasQuery}
			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
				<div class="mb-5 flex items-center gap-3">
					<div class="rounded-2xl bg-sky-500/10 p-3 text-sky-700">
						<SearchIcon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Search</p>
						<h2 class="text-xl font-semibold">Results for “{data.query}”</h2>
					</div>
				</div>

				{#if searchResults.length > 0}
					<div class="space-y-3">
						{#each searchResults as memory (memory._id ?? memory.id)}
							<div class="rounded-[1.4rem] border border-border/60 bg-background/75 px-4 py-4">
								<p class="text-sm leading-7 text-foreground">{memory.content}</p>
								<div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
									<span>{formatTimestamp(memory.createdAt)}</span>
									{#if memory.metadata?.chatId}
										<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.16em]">
											Chat {memory.metadata.chatId}
										</Badge>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="rounded-[1.4rem] border border-dashed border-border/70 bg-background/70 px-4 py-4 text-sm leading-7 text-muted-foreground">
						No saved memory matched this query.
					</div>
				{/if}
			</section>
		{/if}

		<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
			<div class="mb-5 flex items-center gap-3">
				<div class="rounded-2xl bg-muted p-3 text-foreground">
					<BrainIcon class="size-5" />
				</div>
				<div>
					<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Recent memory</p>
					<h2 class="text-xl font-semibold">Latest stored context</h2>
				</div>
			</div>

			{#if data.recentMemories.length > 0}
				<div class="grid gap-4 lg:grid-cols-2">
					{#each data.recentMemories as memory (memory._id ?? memory.id)}
						<div class="rounded-[1.4rem] border border-border/60 bg-background/75 px-4 py-4">
							<p class="text-sm leading-7 text-foreground">{memory.content}</p>
							<div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
								<span>{formatTimestamp(memory.createdAt)}</span>
								{#if memory.metadata}
									<Badge class="rounded-full bg-muted px-3 py-1 text-[11px] tracking-[0.16em] text-muted-foreground">
										Metadata attached
									</Badge>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="rounded-[1.4rem] border border-dashed border-border/70 bg-background/70 px-4 py-4 text-sm leading-7 text-muted-foreground">
					No long-term memory entries have been stored for this account yet.
				</div>
			{/if}
		</section>
	</div>
</StudioPageShell>
