<script lang="ts">
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
	import CheckIcon from '@lucide/svelte/icons/check';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import StudioIcon from '$lib/components/studios/studio-icon.svelte';
	import StudioPageShell from '$lib/components/studios/studio-page-shell.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';

	let { data }: { data: any } = $props();

	let integrationState = $state.raw(data.marketplace ?? []);
	let enablingKey = $state<string | null>(null);

	const categories = $derived.by(() => {
		const groups = new Map<string, any[]>();
		for (const integration of integrationState) {
			const key = integration.category ?? 'other';
			const existing = groups.get(key) ?? [];
			existing.push(integration);
			groups.set(key, existing);
		}
		return Array.from(groups.entries());
	});

	async function enableIntegration(integrationKey: string) {
		if (enablingKey) return;
		enablingKey = integrationKey;
		try {
			const res = await fetch(`/api/studios/${data.studioId}/integrations/${integrationKey}`, {
				method: 'POST',
			});
			if (!res.ok) {
				const payload = await res.json().catch(() => ({}));
				throw new Error(payload.error || 'Failed to enable integration');
			}

			integrationState = integrationState.map((integration: any) =>
				integration.key === integrationKey
					? { ...integration, enabled: true, statusLabel: 'Enabled' }
					: integration,
			);
			toast.success('Integration enabled');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		} finally {
			enablingKey = null;
		}
	}

	function categoryLabel(value: string) {
		return value.charAt(0).toUpperCase() + value.slice(1);
	}
</script>

<StudioPageShell
	class="bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.14),transparent_28%)]"
	containerClass="max-w-7xl"
>
	<div class="space-y-6">
		<section class="rounded-[2.25rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur sm:p-8">
			<div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div class="space-y-3">
					<div class="flex flex-wrap items-center gap-2">
						<Badge class="rounded-full bg-muted px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Marketplace</Badge>
						<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">{integrationState.length} entries</Badge>
					</div>
					<div>
						<h1 class="text-3xl font-semibold tracking-tight sm:text-5xl">{data.studio?.name ?? 'Studio'} marketplace</h1>
						<p class="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
							Add Studio-native integrations and extensions from one surface, then move into each integration page for configuration and provider-specific setup.
						</p>
					</div>
				</div>

				<Button variant="outline" class="rounded-full px-5" href={`/app/studios/${data.studioId}/settings#integrations`}>
					Open Studio settings
				</Button>
			</div>
		</section>

		{#each categories as [category, integrations] (category)}
			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
				<div class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">{categoryLabel(category)}</p>
						<h2 class="text-2xl font-semibold">Studio-ready integrations</h2>
					</div>
					<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">{integrations.length} available</Badge>
				</div>

				<div class="grid gap-4 lg:grid-cols-2">
					{#each integrations as integration (integration.key)}
						<article class="rounded-[1.75rem] border border-border/60 bg-background/75 p-5">
							<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
								<div class="flex items-start gap-4">
									<div class="rounded-2xl bg-muted p-3 text-foreground">
										<StudioIcon name={integration.icon} class="size-5" />
									</div>
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-2">
											<h3 class="text-lg font-semibold">{integration.title}</h3>
											<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">
												{integration.statusLabel}
											</Badge>
										</div>
										<p class="mt-2 text-sm leading-7 text-muted-foreground">{integration.summary}</p>
									</div>
								</div>

								<div class="flex flex-wrap gap-2">
									{#if integration.enabled}
										<Button variant="outline" size="sm" class="rounded-full" href={integration.route}>
											<CheckIcon class="size-4" />
											Manage
										</Button>
									{:else}
										<Button
											size="sm"
											class="rounded-full"
											disabled={enablingKey === integration.key}
											onclick={() => enableIntegration(integration.key)}
										>
											<PlusIcon class="size-4" />
											{enablingKey === integration.key ? 'Enabling...' : 'Enable'}
										</Button>
									{/if}
									<Button variant="ghost" size="sm" class="rounded-full" href={integration.docsUrl} target="_blank" rel="noreferrer">
										Docs
										<ArrowUpRightIcon class="size-4" />
									</Button>
								</div>
							</div>

							<div class="mt-5 flex flex-wrap gap-2">
								{#if integration.missingFields.length > 0}
									{#each integration.missingFields as field (field)}
										<Badge class="rounded-full bg-amber-500/10 px-3 py-1 text-[11px] tracking-[0.16em] text-amber-700">
											Missing {field}
										</Badge>
									{/each}
								{:else if integration.enabled}
									<Badge class="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] tracking-[0.16em] text-emerald-700">
										Ready for Studio use
									</Badge>
								{/if}
							</div>

							<div class="mt-5 grid gap-3 text-sm leading-7 text-muted-foreground">
								{#each integration.bullets as bullet (bullet)}
									<div class="rounded-[1.25rem] border border-border/60 bg-background/70 px-4 py-3">
										{bullet}
									</div>
								{/each}
							</div>
						</article>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</StudioPageShell>
