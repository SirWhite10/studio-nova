<script lang="ts">
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CheckIcon from '@lucide/svelte/icons/check';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import { goto } from '$app/navigation';
	import StudioIcon from '$lib/components/studios/studio-icon.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import { COLOR_PRESETS, PURPOSE_OPTIONS } from '$lib/studios/constants';
	import { toast } from 'svelte-sonner';

	interface Props {
		open?: boolean;
		onopenchange?: (open: boolean) => void;
	}

	let { open = $bindable(false), onopenchange }: Props = $props();

	let step = $state(0);
	let isCreating = $state(false);

	let name = $state('');
	let description = $state('');
	let purpose = $state('general');
	let selectedHue = $state(25);

	const steps = ['Name', 'Purpose', 'Color', 'Review'];
	const canProceed = $derived.by(() => {
		if (step === 0) return name.trim().length >= 1;
		return true;
	});

	const selectedPurpose = $derived(PURPOSE_OPTIONS.find((p) => p.key === purpose) ?? PURPOSE_OPTIONS[3]);
	const selectedColor = $derived(COLOR_PRESETS.find((c) => c.hue === selectedHue) ?? COLOR_PRESETS[0]);

	function reset() {
		step = 0;
		name = '';
		description = '';
		purpose = 'general';
		selectedHue = 25;
		isCreating = false;
	}

	function handleOpenChange(val: boolean) {
		if (!val) reset();
		if (onopenchange) onopenchange(val);
	}

	function next() {
		if (step < steps.length - 1) step++;
	}

	function prev() {
		if (step > 0) step--;
	}

	async function create() {
		isCreating = true;
		try {
			const res = await fetch('/api/studios', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					description: description.trim() || undefined,
					purpose,
					themeHue: selectedHue,
				}),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to create studio');
			}

			const studio = await res.json();
			open = false;
			reset();
			await goto(`/app/studios/${studio.id}`);
		} catch (e: any) {
			toast.error(e.message || 'Failed to create studio');
		} finally {
			isCreating = false;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="max-h-[85vh] overflow-hidden sm:max-w-[580px]">
		<Dialog.Header>
			<div class="flex items-center justify-between">
				<div>
					<Dialog.Title class="text-lg font-semibold">Create New Studio</Dialog.Title>
					<Dialog.Description class="text-sm text-muted-foreground">
						Set up a new workspace for your work
					</Dialog.Description>
				</div>
				<div class="flex items-center gap-1.5">
					{#each steps as s, i}
						<div
							class="h-1.5 rounded-full transition-all {i === step ? 'w-6 bg-primary' : i < step ? 'w-4 bg-foreground/30' : 'w-4 bg-muted'}"
						></div>
					{/each}
				</div>
			</div>
		</Dialog.Header>

		<div class="min-h-[280px] py-4">
			{#if step === 0}
				<div class="space-y-5">
					<div class="space-y-2">
						<label for="create-name" class="text-sm font-medium">Studio name</label>
						<Input
							id="create-name"
							bind:value={name}
							placeholder="e.g. Project Horizon"
							autofocus
						/>
					</div>
					<div class="space-y-2">
						<label for="create-desc" class="text-sm font-medium">Description <span class="text-muted-foreground">(optional)</span></label>
						<Input
							id="create-desc"
							bind:value={description}
							placeholder="What this Studio is for"
						/>
					</div>
				</div>
			{:else if step === 1}
				<div class="space-y-3">
					<p class="text-sm text-muted-foreground">What will you use this Studio for?</p>
					<div class="grid grid-cols-2 gap-3">
						{#each PURPOSE_OPTIONS as opt (opt.key)}
							<button
								type="button"
								class="flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all hover:shadow-sm {purpose === opt.key ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/30'}"
								onclick={() => {
									purpose = opt.key;
									if (selectedHue === PURPOSE_OPTIONS.find(p => p.key === purpose)?.defaultHue || selectedHue === 25) {
										selectedHue = opt.defaultHue;
									}
								}}
							>
								<div class="flex size-9 items-center justify-center rounded-xl bg-muted">
									<StudioIcon name={opt.icon} class="size-4" />
								</div>
								<div>
									<p class="font-medium">{opt.label}</p>
									<p class="mt-0.5 text-xs leading-4 text-muted-foreground">{opt.description}</p>
								</div>
							</button>
						{/each}
					</div>
				</div>
			{:else if step === 2}
				<div class="space-y-4">
					<p class="text-sm text-muted-foreground">Pick a color that represents this Studio</p>
					<div class="grid grid-cols-4 gap-3">
						{#each COLOR_PRESETS as preset (preset.hue)}
							<button
								type="button"
								class="group relative flex h-14 items-center justify-center rounded-2xl border-2 transition-all hover:scale-105 {selectedHue === preset.hue ? 'border-foreground ring-2 ring-foreground/20' : 'border-border hover:border-foreground/40'}"
								style="background: oklch(0.55 0.22 {preset.hue})"
								onclick={() => selectedHue = preset.hue}
							>
								{#if selectedHue === preset.hue}
									<CheckIcon class="size-5 text-white drop-shadow-sm" />
								{/if}
							</button>
						{/each}
					</div>
					<p class="text-center text-xs text-muted-foreground">{selectedColor.name}</p>

					<div class="rounded-2xl border border-border/60 bg-muted/30 p-4">
						<div class="flex items-center gap-3">
							<div class="flex size-10 items-center justify-center rounded-xl text-white shadow" style="background: oklch(0.55 0.22 {selectedHue})">
								<StudioIcon name={selectedPurpose.icon} class="size-4" />
							</div>
							<div>
								<p class="font-medium">{name || 'Studio name'}</p>
								<p class="text-xs text-muted-foreground">{selectedPurpose.label}</p>
							</div>
						</div>
					</div>
				</div>
			{:else if step === 3}
				<div class="space-y-4">
					<div class="flex items-center gap-4 rounded-2xl border border-border/60 bg-muted/30 p-5">
						<div class="flex size-14 items-center justify-center rounded-2xl text-white shadow-lg" style="background: oklch(0.55 0.22 {selectedHue})">
							<StudioIcon name={selectedPurpose.icon} class="size-6" />
						</div>
						<div class="min-w-0 flex-1">
							<h3 class="text-lg font-semibold">{name}</h3>
							{#if description}
								<p class="text-sm text-muted-foreground">{description}</p>
							{/if}
							<div class="mt-2 flex flex-wrap gap-2">
								<Badge variant="outline" class="rounded-full text-xs">{selectedPurpose.label}</Badge>
								<span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs" style="background: oklch(0.55 0.22 {selectedHue}); color: white">
									{selectedColor.name}
								</span>
							</div>
						</div>
					</div>

					<p class="text-sm text-muted-foreground">
						Your Studio will be ready with default integrations (GitHub enabled, Stripe available). You can customize everything later from Settings.
					</p>
				</div>
			{/if}
		</div>

		<Dialog.Footer class="flex-row items-center justify-between gap-2 sm:flex-row">
			<div>
				{#if step > 0}
					<Button variant="ghost" size="sm" onclick={prev}>
						<ArrowLeftIcon class="mr-1 size-3.5" />
						Back
					</Button>
				{/if}
			</div>
			<div class="flex gap-2">
				<Button variant="outline" size="sm" onclick={() => { open = false; }}>
					Cancel
				</Button>
				{#if step < steps.length - 1}
					<Button size="sm" onclick={next} disabled={!canProceed}>
						Continue
						<ArrowRightIcon class="ml-1 size-3.5" />
					</Button>
				{:else}
					<Button size="sm" onclick={create} disabled={isCreating}>
						{#if isCreating}
							<Loader2Icon class="mr-1.5 size-3.5 animate-spin" />
							Creating...
						{:else}
							<SparklesIcon class="mr-1.5 size-3.5" />
							Create Studio
						{/if}
					</Button>
				{/if}
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
