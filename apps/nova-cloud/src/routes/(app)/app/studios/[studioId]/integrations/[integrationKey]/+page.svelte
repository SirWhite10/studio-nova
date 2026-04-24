<script lang="ts">
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
	import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
	import LockKeyholeIcon from '@lucide/svelte/icons/lock-keyhole';
	import { page } from '$app/state';
	import StudioIcon from '$lib/components/studios/studio-icon.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { getIntegrationCapability } from '$lib/integrations/catalog';
	import { toast } from 'svelte-sonner';

let { data }: { data: any } = $props();

	const integrationKey = $derived(page.params.integrationKey ?? 'integration');
	function fallbackIntegration(key: string) {
		const capability = getIntegrationCapability(key);
		if (capability) {
			return {
				id: key,
				key,
				title: capability.title,
				icon: capability.icon,
				summary: capability.summary,
				statusLabel: capability.statusLabel,
				docsUrl: capability.docsUrl,
				bullets: capability.bullets,
				nextSteps: capability.nextSteps,
				enabled: false,
			};
		}

		return {
			id: key,
			key,
			title: key.charAt(0).toUpperCase() + key.slice(1),
			icon: 'blocks',
			summary: 'This Studio integration has a dedicated route and can grow into a full product surface.',
			statusLabel: 'Available',
			docsUrl: 'https://docs.nova.app',
			bullets: [
				'Visible only when enabled for the selected Studio',
				'Owns its own route and sidebar entry inside the Studio shell',
				'Can evolve into a richer control panel without changing the app-shell model',
			],
			nextSteps: [
				'Connection health, provider auth, and Studio-specific sync state.',
				'Quick actions that matter only when this integration is active for the current Studio.',
				'Recent activity and contextual shortcuts for the selected provider.',
			],
			enabled: false,
		};
	}

	let integrationState = $state.raw(data.integration ?? fallbackIntegration(page.params.integrationKey ?? 'integration'));
	const integration = $derived(integrationState ?? fallbackIntegration(integrationKey));
let configSummary = $state(data.configSummary ?? { configured: false, updatedAt: null, fields: [] });
let formValues = $state(
	Object.fromEntries((data.configSummary?.fields ?? []).map((field: any) => [field.key, field.value ?? ''])),
);
let isSaving = $state(false);
let isEnabling = $state(false);
const packagedCapability = $derived(data.packagedCapability ?? null);

	async function refreshConfigSummary() {
		const [configRes, integrationRes] = await Promise.all([
			fetch(`/api/studios/${data.studioId}/integrations/${integrationKey}/config`),
			fetch(`/api/studios/${data.studioId}/integrations/${integrationKey}`),
		]);
		if (configRes.ok) {
			const payload = await configRes.json();
			configSummary = payload.summary ?? configSummary;
		}
		if (integrationRes.ok) {
			const payload = await integrationRes.json();
			integrationState = payload.integration ?? integrationState;
		}
		for (const field of configSummary.fields ?? []) {
			if (!field.secret) formValues[field.key] = field.value ?? '';
			if (field.secret && !field.hasValue) formValues[field.key] = '';
		}
	}

	async function saveConfig() {
		isSaving = true;
		try {
			const values = Object.fromEntries(
				(configSummary.fields ?? []).map((field: any) => [field.key, formValues[field.key] ?? '']),
			);
			const res = await fetch(`/api/studios/${data.studioId}/integrations/${integrationKey}/config`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ values }),
			});
			if (!res.ok) {
				const payload = await res.json().catch(() => ({}));
				throw new Error(payload.error || 'Failed to save integration configuration');
			}
			const payload = await res.json();
			configSummary = payload.summary ?? configSummary;
			for (const field of configSummary.fields ?? []) {
				if (field.secret) formValues[field.key] = '';
				else formValues[field.key] = field.value ?? '';
			}
			toast.success('Integration configuration saved');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		} finally {
			isSaving = false;
		}
	}

	async function enableIntegration() {
		isEnabling = true;
		try {
			const res = await fetch(`/api/studios/${data.studioId}/integrations/${integrationKey}`, {
				method: 'POST',
			});
			if (!res.ok) {
				const payload = await res.json().catch(() => ({}));
				throw new Error(payload.error || 'Failed to enable integration');
			}
			const payload = await res.json().catch(() => ({}));
			integrationState = payload.integration ?? { ...integrationState, enabled: true };
			toast.success('Integration enabled');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		} finally {
			isEnabling = false;
		}
	}

	function formatTimestamp(value?: number | null) {
		if (!value) return 'Not configured yet';
		return new Date(value).toLocaleString();
	}
</script>

<div class="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),transparent_30%)] px-6 py-8 sm:px-10">
	<div class="mx-auto flex max-w-6xl flex-col gap-6">
		<section class="rounded-[2.25rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur sm:p-8">
			<div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div class="flex items-start gap-4">
					<div class="rounded-[1.6rem] bg-emerald-500/10 p-4 text-emerald-700">
						<StudioIcon name={integration.icon} class="size-7" />
					</div>
					<div class="space-y-3">
						<div class="flex flex-wrap items-center gap-2">
							<Badge class="rounded-full bg-muted px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Integrations</Badge>
							<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">{integration.enabled ? 'Enabled' : integration.statusLabel}</Badge>
						</div>
						<div>
							<h1 class="text-3xl font-semibold tracking-tight sm:text-5xl">{integration.title}</h1>
							<p class="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
								{integration.summary}
							</p>
						</div>
					</div>
				</div>

				<Button variant="outline" class="rounded-full px-5" href={integration.docsUrl} target="_blank" rel="noreferrer">
					Open provider docs
					<ArrowUpRightIcon class="size-4" />
				</Button>
			</div>
		</section>

				<div class="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
				<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Why this page exists</p>
				<h2 class="mt-2 text-2xl font-semibold">A real Studio integration surface</h2>
				<div class="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
					{#each integration.bullets as bullet}
						<div class="flex items-start gap-3 rounded-[1.3rem] border border-border/60 bg-background/75 px-4 py-4">
							<div class="rounded-full bg-muted p-1.5 text-foreground">
								<BadgeCheckIcon class="size-4" />
							</div>
							<p>{bullet}</p>
						</div>
					{/each}
				</div>
			</section>

			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
				<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Configuration</p>
				<h2 class="mt-2 text-2xl font-semibold">Credentials and Studio settings</h2>
				<div class="mt-5 space-y-4">
					<div class="rounded-[1.3rem] border border-border/60 bg-background/75 px-4 py-4 text-sm leading-7 text-muted-foreground">
						<p class="font-medium text-foreground">
							{configSummary.configured ? 'Configuration saved' : 'Configuration needed'}
						</p>
						<p class="mt-1">Last updated {formatTimestamp(configSummary.updatedAt)}</p>
					</div>

					{#each configSummary.fields ?? [] as field (field.key)}
						<div class="space-y-2">
							<div class="flex items-center gap-2">
								<label class="text-sm font-medium" for={field.key}>
									{field.label}{field.required ? ' *' : ''}
								</label>
								{#if field.secret}
									<LockKeyholeIcon class="size-4 text-muted-foreground" />
								{/if}
							</div>
							{#if field.type === 'url'}
								<Input
									id={field.key}
									type="url"
									bind:value={formValues[field.key]}
									placeholder={field.secret && field.hasValue ? `Saved ${field.maskedValue}` : field.placeholder}
								/>
							{:else if field.type === 'password'}
								<Input
									id={field.key}
									type="password"
									bind:value={formValues[field.key]}
									placeholder={field.hasValue ? `Saved ${field.maskedValue}. Leave blank to keep it.` : field.placeholder}
								/>
							{:else if field.key === 'repository'}
								<Input
									id={field.key}
									type="text"
									bind:value={formValues[field.key]}
									placeholder={field.placeholder}
								/>
							{:else}
								<Textarea
									id={field.key}
									bind:value={formValues[field.key]}
									rows={3}
									placeholder={field.placeholder}
								/>
							{/if}
							{#if field.helpText}
								<p class="text-sm text-muted-foreground">{field.helpText}</p>
							{/if}
						</div>
					{/each}

					<div class="flex flex-wrap gap-3 pt-2">
						<Button class="rounded-full px-5" disabled={isSaving} onclick={saveConfig}>
							{isSaving ? 'Saving...' : 'Save configuration'}
						</Button>
						{#if !integration.enabled}
							<Button variant="outline" class="rounded-full px-5" disabled={isEnabling} onclick={enableIntegration}>
								{isEnabling ? 'Enabling...' : 'Enable integration'}
							</Button>
						{/if}
						<Button variant="ghost" class="rounded-full px-5" onclick={refreshConfigSummary}>
							Refresh configuration
						</Button>
					</div>
				</div>
			</section>

			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur xl:col-span-2">
				<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Next step</p>
				<h2 class="mt-2 text-2xl font-semibold">What to build here next</h2>
				<div class="mt-5 grid gap-3 text-sm leading-7 text-muted-foreground md:grid-cols-3">
					{#each integration.nextSteps as nextStep}
						<div class="rounded-[1.3rem] border border-border/60 bg-background/75 px-4 py-4">
							{nextStep}
						</div>
					{/each}
				</div>
			</section>

			{#if integrationKey === 'user-auth' && packagedCapability}
				<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur xl:col-span-2">
					<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Packaged capability</p>
					<h2 class="mt-2 text-2xl font-semibold">Install and use User Auth</h2>
					<div class="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
						<div class="space-y-4">
							<div class="rounded-[1.3rem] border border-border/60 bg-background/75 px-4 py-4">
								<p class="text-sm font-medium">Install command</p>
								<pre class="mt-3 overflow-x-auto rounded-xl bg-muted/70 px-3 py-3 font-mono text-xs">{packagedCapability.installCommand}</pre>
							</div>
							<div class="rounded-[1.3rem] border border-border/60 bg-background/75 px-4 py-4">
								<p class="text-sm font-medium">Enabled providers</p>
								<div class="mt-3 flex flex-wrap gap-2">
									{#each packagedCapability.providerBadges as provider}
										<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.16em]">{provider}</Badge>
									{/each}
								</div>
							</div>
							<div class="rounded-[1.3rem] border border-border/60 bg-background/75 px-4 py-4">
								<p class="text-sm font-medium">Required env vars</p>
								<div class="mt-3 flex flex-wrap gap-2">
									{#each packagedCapability.envVars as envVar}
										<code class="rounded-full bg-muted px-2.5 py-1 text-xs">{envVar}</code>
									{/each}
								</div>
							</div>
							<div class="rounded-[1.3rem] border border-border/60 bg-background/75 px-4 py-4">
								<p class="text-sm font-medium">Credential health</p>
								{#if packagedCapability.missingCredentials.length === 0}
									<p class="mt-3 text-sm text-emerald-700">All configured providers have the required credentials saved.</p>
								{:else}
									<div class="mt-3 space-y-2 text-sm text-muted-foreground">
										<p>Missing credentials before the packaged auth flow is fully ready:</p>
										<ul class="list-disc pl-5">
											{#each packagedCapability.missingCredentials as item}
												<li>{item}</li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
						</div>

						<div class="space-y-4">
							{#each packagedCapability.snippets as snippet}
								<div class="rounded-[1.3rem] border border-border/60 bg-background/75 px-4 py-4">
									<p class="text-sm font-medium">{snippet.title}</p>
									<pre class="mt-3 overflow-x-auto rounded-xl bg-muted/70 px-3 py-3 font-mono text-xs leading-6">{snippet.code}</pre>
								</div>
							{/each}
						</div>
					</div>
				</section>
			{/if}
		</div>
	</div>
</div>
