<script lang="ts">
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import Clock3Icon from '@lucide/svelte/icons/clock-3';
	import CrownIcon from '@lucide/svelte/icons/crown';
	import InfinityIcon from '@lucide/svelte/icons/infinity';
	import RocketIcon from '@lucide/svelte/icons/rocket';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { toast } from 'svelte-sonner';
	import { COLOR_PRESETS } from '$lib/studios/constants';

	let { data }: { data: any } = $props();

	let isUpgrading = $state(false);
	let isDeleting = $state(false);
	let deleteConfirmOpen = $state(false);
	let isSaving = $state(false);
	let currentPlan = $state(data?.studioPlan?.plan ?? 'free');

	let studioName = $state(data?.studio?.name ?? '');
	let studioDescription = $state(data?.studio?.description ?? '');
	let selectedHue = $state(data?.studio?.themeHue ?? 25);

	const studioId = $derived(page.params.studioId);
	const isPro = $derived(currentPlan === 'pro');
	const planLabel = $derived(isPro ? 'Pro' : 'Free');
	const planDesc = $derived(isPro ? '24hr persistent sandbox runtime per session' : '1hr sandbox runtime per session');

	async function refreshStudioState(showToast = false) {
		const res = await fetch(`/api/studios/${studioId}`);
		if (!res.ok) {
			if (showToast) toast.error('Failed to refresh Studio state');
			return;
		}
		const studio = await res.json();
		studioName = studio.name ?? studioName;
		studioDescription = studio.description ?? '';
		selectedHue = studio.themeHue ?? selectedHue;
		if (showToast) toast.success('Studio refreshed');
	}

	async function saveGeneral() {
		isSaving = true;
		try {
			const res = await fetch(`/api/studios/${studioId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: studioName,
					description: studioDescription,
				}),
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to save');
			}
			const updated = await res.json();
			studioName = updated.name ?? studioName;
			studioDescription = updated.description ?? '';
			toast.success('Studio updated');
		} catch (e: any) {
			toast.error(e.message || 'Failed to save');
		} finally {
			isSaving = false;
		}
	}

	async function saveAppearance() {
		isSaving = true;
		try {
			const res = await fetch(`/api/studios/${studioId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					themeHue: selectedHue,
				}),
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to save');
			}
			const updated = await res.json();
			selectedHue = updated.themeHue ?? selectedHue;
			toast.success('Appearance updated');
		} catch (e: any) {
			toast.error(e.message || 'Failed to save');
		} finally {
			isSaving = false;
		}
	}

	async function upgradeToPro() {
		if (!data.userId) {
			toast.error('Unable to identify user');
			return;
		}

		isUpgrading = true;
		try {
			const res = await fetch('/api/user-plans', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ plan: 'pro' }),
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to upgrade');
			}

			currentPlan = 'pro';
			toast.success('Upgraded to Pro — 24hr sandbox runtime activated');
		} catch (e: any) {
			toast.error(e.message || 'Upgrade failed');
		} finally {
			isUpgrading = false;
		}
	}

	async function downgradeToFree() {
		if (!data.userId) return;

		isUpgrading = true;
		try {
			const res = await fetch('/api/user-plans', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ plan: 'free' }),
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to downgrade');
			}

			currentPlan = 'free';
			toast.success('Switched back to Free plan');
		} catch (e: any) {
			toast.error(e.message || 'Failed to switch plan');
		} finally {
			isUpgrading = false;
		}
	}

	async function deleteStudio() {
		isDeleting = true;
		try {
			const res = await fetch(`/api/studios/${studioId}`, {
				method: 'DELETE',
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to delete studio');
			}

			toast.success('Studio deleted');
			await goto('/app');
		} catch (e: any) {
			toast.error(e.message || 'Failed to delete studio');
		} finally {
			isDeleting = false;
		}
	}
</script>

<div class="min-h-[calc(100vh-4rem)] px-6 py-8 sm:px-10">
	<div class="mx-auto flex max-w-4xl flex-col gap-8">
		<div>
			<p class="text-xs uppercase tracking-[0.22em] text-muted-foreground">Settings</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight">Studio settings</h1>
		</div>

		<Separator />

		<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur sm:p-8">
			<div class="flex items-center gap-3">
				<div class="flex size-10 items-center justify-center rounded-xl bg-primary/10">
					<InfinityIcon class="size-5 text-primary" />
				</div>
				<div>
					<h2 class="text-lg font-semibold">General</h2>
					<p class="text-sm text-muted-foreground">Studio name and description</p>
				</div>
			</div>

			<div class="mt-6 space-y-4">
				<div class="space-y-2">
					<label for="studio-name" class="text-sm font-medium">Name</label>
					<Input id="studio-name" bind:value={studioName} placeholder="My Studio" />
				</div>
				<div class="space-y-2">
					<label for="studio-desc" class="text-sm font-medium">Description</label>
					<Input id="studio-desc" bind:value={studioDescription} placeholder="A short description of this Studio" />
				</div>
				<Button class="rounded-full px-6" onclick={saveGeneral} disabled={isSaving || !studioName.trim()}>
					{isSaving ? 'Saving...' : 'Save changes'}
				</Button>
			</div>
		</section>

		<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur sm:p-8">
			<div class="flex items-center gap-3">
				<div class="flex size-10 items-center justify-center rounded-xl bg-primary/10" style="background: oklch(0.55 0.22 {selectedHue} / 0.15)">
					<div class="size-5 rounded-full" style="background: oklch(0.55 0.22 {selectedHue})"></div>
				</div>
				<div>
					<h2 class="text-lg font-semibold">Appearance</h2>
					<p class="text-sm text-muted-foreground">Pick a color theme for this Studio</p>
				</div>
			</div>

			<div class="mt-6 space-y-4">
				<div class="grid grid-cols-4 gap-3 sm:grid-cols-8">
					{#each COLOR_PRESETS as preset (preset.hue)}
						<button
							type="button"
							class="group relative flex h-12 items-center justify-center rounded-xl border-2 transition-all hover:scale-105 {selectedHue === preset.hue ? 'border-foreground ring-2 ring-foreground/20' : 'border-border hover:border-foreground/50'}"
							style="background: oklch(0.55 0.22 {preset.hue})"
							onclick={() => selectedHue = preset.hue}
							title={preset.name}
						>
							{#if selectedHue === preset.hue}
								<CheckIcon class="size-4 text-white drop-shadow-sm" />
							{/if}
						</button>
					{/each}
				</div>

				<div class="rounded-[1.5rem] border border-border/60 bg-background/80 p-4">
					<p class="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Preview</p>
					<div class="flex items-center gap-4">
						<div class="flex size-12 items-center justify-center rounded-2xl text-white shadow-md" style="background: oklch(0.55 0.22 {selectedHue})">
							<InfinityIcon class="size-5" />
						</div>
						<div class="flex flex-wrap gap-2">
							<span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white" style="background: oklch(0.55 0.22 {selectedHue})">Primary</span>
							<span class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium" style="border-color: oklch(0.55 0.22 {selectedHue} / 0.4); color: oklch(0.45 0.15 {selectedHue})">Outline</span>
							<span class="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">Muted</span>
						</div>
					</div>
				</div>

				<Button class="rounded-full px-6" onclick={saveAppearance} disabled={isSaving}>
					{isSaving ? 'Saving...' : 'Apply theme'}
				</Button>
			</div>
		</section>

		<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur sm:p-8">
			<div class="flex items-center gap-3">
				<div class="flex size-10 items-center justify-center rounded-xl bg-primary/10">
					<CrownIcon class="size-5 text-primary" />
				</div>
				<div>
					<h2 class="text-lg font-semibold">Plan &amp; Runtime</h2>
					<p class="text-sm text-muted-foreground">Manage your sandbox runtime limits</p>
				</div>
			</div>

			<div class="mt-6 grid gap-4 sm:grid-cols-2">
				<div class="rounded-[1.75rem] border border-border/60 bg-background/80 p-5">
					<div class="flex items-center gap-2">
						<Clock3Icon class="size-4 text-muted-foreground" />
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current Plan</p>
					</div>
					<p class="mt-3 text-xl font-semibold">{planLabel}</p>
					<p class="mt-2 text-sm leading-6 text-muted-foreground">{planDesc}</p>
				</div>

				<div class="rounded-[1.75rem] border border-border/60 bg-background/80 p-5">
					<div class="flex items-center gap-2">
						<InfinityIcon class="size-4 text-muted-foreground" />
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Studios</p>
					</div>
					<p class="mt-3 text-xl font-semibold">Unlimited</p>
					<p class="mt-2 text-sm leading-6 text-muted-foreground">
						Create as many Studios as you need on any plan
					</p>
				</div>
			</div>

			<Separator class="my-6" />

			{#if isPro}
				<div class="rounded-[1.5rem] border border-primary/20 bg-primary/5 p-5">
					<div class="flex items-center gap-2">
						<CheckCircleIcon class="size-5 text-primary" />
						<h3 class="font-semibold">You're on Pro</h3>
					</div>
					<ul class="mt-3 space-y-2 text-sm text-muted-foreground">
						<li class="flex items-center gap-2">
							<CheckCircleIcon class="size-3.5 text-primary" />
							24hr persistent sandbox runtime
						</li>
						<li class="flex items-center gap-2">
							<CheckCircleIcon class="size-3.5 text-primary" />
							Unlimited Studios
						</li>
						<li class="flex items-center gap-2">
							<CheckCircleIcon class="size-3.5 text-primary" />
							Long-running dev servers with hot reload
						</li>
						<li class="flex items-center gap-2">
							<CheckCircleIcon class="size-3.5 text-primary" />
							Priority sandbox provisioning
						</li>
					</ul>
					<div class="mt-4 flex gap-3">
						<Button variant="outline" size="sm" class="rounded-full" disabled>
							Manage subscription
						</Button>
						<Button variant="ghost" size="sm" class="rounded-full text-muted-foreground" onclick={downgradeToFree} disabled={isUpgrading}>
							Switch to Free
						</Button>
					</div>
				</div>
			{:else}
				<div class="rounded-[1.5rem] border border-border/70 bg-background/80 p-5">
					<div class="flex items-center gap-2">
						<RocketIcon class="size-5 text-primary" />
						<h3 class="font-semibold">Upgrade to Pro</h3>
						<Badge class="ml-2 rounded-full bg-primary/10 text-primary text-[10px] px-2">$49/mo</Badge>
					</div>
					<ul class="mt-3 space-y-2 text-sm text-muted-foreground">
						<li class="flex items-center gap-2">
							<ZapIcon class="size-3.5 text-primary" />
							24hr persistent sandbox runtime (vs 1hr)
						</li>
						<li class="flex items-center gap-2">
							<ZapIcon class="size-3.5 text-primary" />
							Long-running dev servers that stay alive overnight
						</li>
						<li class="flex items-center gap-2">
							<ZapIcon class="size-3.5 text-primary" />
							Priority sandbox provisioning
						</li>
					</ul>
					<Button class="mt-4 rounded-full px-6" onclick={upgradeToPro} disabled={isUpgrading}>
						{isUpgrading ? 'Upgrading...' : 'Upgrade to Pro'}
					</Button>
					<p class="mt-2 text-xs text-muted-foreground">
						Payment integration coming soon. Plan is set instantly for now.
					</p>
				</div>
			{/if}
		</section>

		<section class="rounded-[2rem] border border-destructive/30 bg-destructive/5 p-6 shadow-sm sm:p-8">
			<div class="flex items-center gap-3">
				<div class="flex size-10 items-center justify-center rounded-xl bg-destructive/10">
					<Trash2Icon class="size-5 text-destructive" />
				</div>
				<div>
					<h2 class="text-lg font-semibold">Danger Zone</h2>
					<p class="text-sm text-muted-foreground">Irreversible actions for this Studio</p>
				</div>
			</div>

			<div class="mt-6 rounded-[1.5rem] border border-destructive/20 bg-background/80 p-5">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h3 class="font-semibold">Delete this Studio</h3>
						<p class="mt-1 text-sm text-muted-foreground">
							Permanently remove this Studio, its chats, sandbox, and all related data. This cannot be undone.
						</p>
					</div>
					<AlertDialog.Root bind:open={deleteConfirmOpen}>
						<AlertDialog.Trigger>
							{#snippet child({ props })}
								<Button variant="destructive" class="shrink-0 rounded-full" {...props}>
									Delete Studio
								</Button>
							{/snippet}
						</AlertDialog.Trigger>
						<AlertDialog.Content>
							<AlertDialog.Header>
								<AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
								<AlertDialog.Description>
									This will permanently delete this Studio along with all its chats, messages, sandbox, extensions, and runtime processes. This action cannot be undone.
								</AlertDialog.Description>
							</AlertDialog.Header>
							<AlertDialog.Footer>
								<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
								<AlertDialog.Action>
									{#snippet child({ props })}
										<Button
											variant="destructive"
											class="rounded-full"
											{...props}
											onclick={deleteStudio}
											disabled={isDeleting}
										>
											{isDeleting ? 'Deleting...' : 'Yes, delete Studio'}
										</Button>
									{/snippet}
								</AlertDialog.Action>
							</AlertDialog.Footer>
						</AlertDialog.Content>
					</AlertDialog.Root>
				</div>
			</div>
		</section>
	</div>
</div>
