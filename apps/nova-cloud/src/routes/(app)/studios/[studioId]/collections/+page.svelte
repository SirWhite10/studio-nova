<script lang="ts">
	import Layers3Icon from '@lucide/svelte/icons/layers-3';
	import NetworkIcon from '@lucide/svelte/icons/network';
	import StudioPageShell from '$lib/components/studios/studio-page-shell.svelte';
	import { Badge } from '$lib/components/ui/badge';

	let { data }: { data: any } = $props();
	const storageSummary = $derived(data.storageSummary);
	const workspaces = $derived(data.workspaces ?? []);
</script>

<StudioPageShell
	class="bg-[radial-gradient(circle_at_top_left,_rgba(234,179,8,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.12),transparent_28%)]"
	containerClass="max-w-6xl"
>
	<div class="space-y-6">
		<section class="rounded-[2rem] border border-border/70 bg-background/85 p-8 shadow-sm backdrop-blur">
			<div class="space-y-3">
				<div class="flex flex-wrap items-center gap-2">
					<Badge class="rounded-full bg-muted px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Content</Badge>
					<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">Collections</Badge>
					<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">2 GB included</Badge>
				</div>
				<h1 class="text-3xl font-semibold tracking-tight sm:text-5xl">{data.studio?.name ?? 'Studio'} collections</h1>
				<p class="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
					Collections are the CMS-ready layer that can sit above raw files. This page establishes the Studio surface for structured content models before deeper authoring and publishing tooling lands.
				</p>
			</div>
		</section>

		<div class="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
				<div class="mb-5 flex items-center gap-3">
					<div class="rounded-2xl bg-amber-500/10 p-3 text-amber-700">
						<Layers3Icon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Model</p>
						<h2 class="text-lg font-semibold">How Collections fit the Studio</h2>
					</div>
				</div>

				<div class="space-y-3 text-sm leading-7 text-muted-foreground">
					<div class="rounded-[1.4rem] border border-border/60 bg-background/70 px-4 py-4">
						A collection can represent a repeatable content type like posts, docs, changelog entries, landing sections, or products.
					</div>
					<div class="rounded-[1.4rem] border border-border/60 bg-background/70 px-4 py-4">
						Files remain the underlying persistent storage surface, while Collections will eventually provide schema, organization, and publishing intent.
					</div>
					<div class="rounded-[1.4rem] border border-border/60 bg-background/70 px-4 py-4">
						This route is intentionally product-visible now so future CMS work lands inside the Studio shell instead of becoming another disconnected subsystem.
					</div>
				</div>
			</section>

			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
				<div class="mb-5 flex items-center gap-3">
					<div class="rounded-2xl bg-sky-500/10 p-3 text-sky-700">
						<NetworkIcon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Storage context</p>
						<h2 class="text-lg font-semibold">Current content footprint</h2>
					</div>
				</div>

				{#if storageSummary}
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="rounded-[1.4rem] border border-border/60 bg-background/70 p-4">
							<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Used</p>
							<p class="mt-3 text-2xl font-semibold">{storageSummary.usedLabel}</p>
						</div>
						<div class="rounded-[1.4rem] border border-border/60 bg-background/70 p-4">
							<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Remaining</p>
							<p class="mt-3 text-2xl font-semibold">{storageSummary.remainingLabel}</p>
						</div>
						<div class="rounded-[1.4rem] border border-border/60 bg-background/70 p-4">
							<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Files</p>
							<p class="mt-3 text-2xl font-semibold">{storageSummary.fileCount}</p>
						</div>
						<div class="rounded-[1.4rem] border border-border/60 bg-background/70 p-4">
							<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Folders</p>
							<p class="mt-3 text-2xl font-semibold">{storageSummary.folderCount}</p>
						</div>
					</div>
				{:else}
					<div class="rounded-[1.4rem] border border-dashed border-border/70 bg-background/70 px-4 py-4 text-sm leading-7 text-muted-foreground">
						Storage metrics are unavailable until object storage bindings are available in this environment.
					</div>
				{/if}
			</section>
		</div>

		<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
			<div class="mb-5 flex items-center gap-3">
				<div class="rounded-2xl bg-muted p-3 text-foreground">
					<Layers3Icon class="size-5" />
				</div>
				<div>
					<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace paths</p>
					<h2 class="text-lg font-semibold">Where collections will publish from</h2>
				</div>
			</div>

			{#if workspaces.length > 0}
				<div class="grid gap-4 lg:grid-cols-2">
					{#each workspaces as workspace (workspace.workspace._id)}
						<div class="rounded-[1.4rem] border border-border/60 bg-background/70 px-4 py-4">
							<p class="font-medium">{workspace.workspace.name}</p>
							<p class="mt-2 text-sm leading-7 text-muted-foreground">
								Content path
								<span class="font-mono text-[11px] text-foreground">{workspace.runtimeContract.storage.contentPath}</span>
							</p>
						</div>
					{/each}
				</div>
			{:else}
				<div class="rounded-[1.4rem] border border-dashed border-border/70 bg-background/70 px-4 py-4 text-sm leading-7 text-muted-foreground">
					No deployment workspaces exist yet. Create one to establish a content publishing target.
				</div>
			{/if}
		</section>
	</div>
</StudioPageShell>
