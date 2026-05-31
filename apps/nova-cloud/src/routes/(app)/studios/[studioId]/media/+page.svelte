<script lang="ts">
	import ImageIcon from '@lucide/svelte/icons/image';
	import ImagesIcon from '@lucide/svelte/icons/images';
	import StudioPageShell from '$lib/components/studios/studio-page-shell.svelte';
	import { Badge } from '$lib/components/ui/badge';

	let { data }: { data: any } = $props();
	const storageSummary = $derived(data.storageSummary);

	function formatTimestamp(value?: string | null) {
		if (!value) return 'Not available';
		return new Date(value).toLocaleString();
	}
</script>

<StudioPageShell
	class="bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),transparent_28%)]"
	containerClass="max-w-6xl"
>
	<div class="space-y-6">
		<section class="rounded-[2rem] border border-border/70 bg-background/85 p-8 shadow-sm backdrop-blur">
			<div class="space-y-3">
				<div class="flex flex-wrap items-center gap-2">
					<Badge class="rounded-full bg-muted px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Content</Badge>
					<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">Media</Badge>
					<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">2 GB included</Badge>
				</div>
				<h1 class="text-3xl font-semibold tracking-tight sm:text-5xl">{data.studio?.name ?? 'Studio'} media</h1>
				<p class="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
					Media will become the reusable asset layer for content-heavy Studios. It sits alongside Files so uploads can later be organized into a more intentional brand and publishing workflow.
				</p>
			</div>
		</section>

		<div class="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
				<div class="mb-5 flex items-center gap-3">
					<div class="rounded-2xl bg-sky-500/10 p-3 text-sky-700">
						<ImagesIcon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Media layer</p>
						<h2 class="text-lg font-semibold">What this surface is for</h2>
					</div>
				</div>

				<div class="space-y-3 text-sm leading-7 text-muted-foreground">
					<div class="rounded-[1.4rem] border border-border/60 bg-background/70 px-4 py-4">
						Track reusable brand assets, screenshots, illustrations, downloadable files, and publishing media without losing the Studio-level storage context.
					</div>
					<div class="rounded-[1.4rem] border border-border/60 bg-background/70 px-4 py-4">
						Keep the product model ready for thumbnails, alt text, derived renditions, and asset-to-entry references later.
					</div>
					<div class="rounded-[1.4rem] border border-border/60 bg-background/70 px-4 py-4">
						Use Files for raw upload operations today. This Media route establishes the dedicated UX destination for richer asset workflows.
					</div>
				</div>
			</section>

			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
				<div class="mb-5 flex items-center gap-3">
					<div class="rounded-2xl bg-emerald-500/10 p-3 text-emerald-700">
						<ImageIcon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current footprint</p>
						<h2 class="text-lg font-semibold">Asset storage posture</h2>
					</div>
				</div>

				{#if storageSummary}
					<div class="space-y-4">
						<div class="rounded-[1.4rem] border border-border/60 bg-background/70 p-4">
							<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Usage</p>
							<p class="mt-3 text-2xl font-semibold">{storageSummary.displayLabel}</p>
						</div>
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="rounded-[1.4rem] border border-border/60 bg-background/70 p-4">
								<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Files</p>
								<p class="mt-3 text-2xl font-semibold">{storageSummary.fileCount}</p>
							</div>
							<div class="rounded-[1.4rem] border border-border/60 bg-background/70 p-4">
								<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Latest upload</p>
								<p class="mt-3 text-sm font-medium">{formatTimestamp(storageSummary.latestUploadAt)}</p>
							</div>
						</div>
					</div>
				{:else}
					<div class="rounded-[1.4rem] border border-dashed border-border/70 bg-background/70 px-4 py-4 text-sm leading-7 text-muted-foreground">
						Storage metrics are unavailable until object storage bindings are available in this environment.
					</div>
				{/if}
			</section>
		</div>
	</div>
</StudioPageShell>
