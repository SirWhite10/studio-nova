<script lang="ts">
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import Layers3Icon from "@lucide/svelte/icons/layers-3";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import WrenchIcon from "@lucide/svelte/icons/wrench";
	import { goto } from "$app/navigation";
	import StudioIcon from "$lib/components/studios/studio-icon.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { studioCreateDialog } from "$lib/studios/create-dialog-state.svelte";
	import type { StudioSummary } from "$lib/studios/types";

	type PageData = {
		data?: {
			studios?: StudioSummary[];
			currentStudio?: StudioSummary | null;
		};
	};

	let { data }: { data?: PageData } = $props();

	const studios = $derived(data?.data?.studios ?? []);
	const currentStudio = $derived(data?.data?.currentStudio ?? null);

	async function openStudio(url: string) {
		await goto(url);
	}
</script>

{#if studios.length === 0}
	<div class="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),transparent_36%),linear-gradient(180deg,rgba(17,24,39,0.02),transparent_24%)] px-6 py-12 sm:px-10">
		<div class="mx-auto flex max-w-5xl flex-col gap-10">
			<div class="max-w-3xl space-y-5">
				<Badge class="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-amber-700">
					Studios
				</Badge>
				<h1 class="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
					Build your first Studio and let the app organize around it.
				</h1>
				<p class="max-w-2xl text-lg leading-8 text-muted-foreground">
					A Studio is your persistent Nova environment. It keeps conversations, runtime state,
					and integrations together so the app feels like a place you return to, not a list of detached chats.
				</p>
				<div class="flex flex-wrap gap-3 pt-2">
					<Button size="lg" class="gap-2 rounded-full px-6" onclick={() => studioCreateDialog.openDialog()}>
					Create your first studio
					<ArrowRightIcon class="size-4" />
				</Button>
				</div>
			</div>

			<div class="grid gap-4 md:grid-cols-3">
				<div class="rounded-3xl border border-border/70 bg-background/80 p-6 shadow-sm backdrop-blur">
					<div class="mb-4 inline-flex rounded-2xl bg-amber-500/10 p-3 text-amber-700">
						<Layers3Icon class="size-5" />
					</div>
					<h2 class="text-lg font-medium">A real home for your work</h2>
					<p class="mt-2 text-sm leading-6 text-muted-foreground">
						Studios keep chats, runtime context, and future files together under one deliberate shell.
					</p>
				</div>
				<div class="rounded-3xl border border-border/70 bg-background/80 p-6 shadow-sm backdrop-blur">
					<div class="mb-4 inline-flex rounded-2xl bg-sky-500/10 p-3 text-sky-700">
						<WrenchIcon class="size-5" />
					</div>
					<h2 class="text-lg font-medium">Runtime that belongs somewhere</h2>
					<p class="mt-2 text-sm leading-6 text-muted-foreground">
						Your sandbox runtime becomes part of a Studio instead of floating behind a global chat list.
					</p>
				</div>
				<div class="rounded-3xl border border-border/70 bg-background/80 p-6 shadow-sm backdrop-blur">
					<div class="mb-4 inline-flex rounded-2xl bg-emerald-500/10 p-3 text-emerald-700">
						<SparklesIcon class="size-5" />
					</div>
					<h2 class="text-lg font-medium">Integrations grow with the Studio</h2>
					<p class="mt-2 text-sm leading-6 text-muted-foreground">
						When you enable something like Stripe or GitHub, it appears under that Studio's Integrations group.
					</p>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),transparent_30%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.12),transparent_30%)] px-6 py-8 sm:px-10">
		<div class="mx-auto flex max-w-7xl flex-col gap-8">
			<div class="flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-background/80 p-6 shadow-sm backdrop-blur md:flex-row md:items-end md:justify-between">
				<div class="space-y-3">
					<Badge class="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-sky-700">
						Studio Dashboard
					</Badge>
					<h1 class="text-3xl font-semibold tracking-tight sm:text-5xl">
						Pick up where each Studio left off.
					</h1>
					<p class="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
						Studios are your persistent Nova environments. Choose one to jump into its chats, runtime,
						and Integrations, or create a new Studio for a fresh working context.
					</p>
				</div>
				<div class="flex gap-3">
					<Button size="lg" class="gap-2 rounded-full px-5" onclick={() => studioCreateDialog.openDialog()}>
					New Studio
					<ArrowRightIcon class="size-4" />
				</Button>
				</div>
			</div>

			{#if currentStudio}
				<div class="rounded-[2rem] border border-border/70 bg-background/80 p-6 shadow-sm backdrop-blur">
					<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div class="flex items-center gap-4">
							<div class={`flex size-14 items-center justify-center rounded-3xl bg-gradient-to-br ${currentStudio.color ?? 'from-amber-400/80 via-orange-500/70 to-rose-500/80'} text-white shadow-lg`}>
								<StudioIcon name={currentStudio.icon} class="size-6" />
							</div>
							<div>
								<p class="text-xs uppercase tracking-[0.22em] text-muted-foreground">Resume Studio</p>
								<h2 class="text-2xl font-semibold">{currentStudio.name}</h2>
								<p class="text-sm text-muted-foreground">{currentStudio.runtimeLabel} · {currentStudio.chatCount} chats</p>
							</div>
						</div>
						<div class="flex gap-3">
							<Button variant="outline" class="rounded-full px-5" onclick={() => openStudio(currentStudio.url)}>
								Open overview
							</Button>
							<Button class="rounded-full px-5" onclick={() => openStudio(currentStudio.newChatUrl)}>
								New chat
							</Button>
						</div>
					</div>
				</div>
			{/if}

			<div class="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
				{#each studios as studio (studio.id)}
					<button
						type="button"
						onclick={() => openStudio(studio.url)}
						class="group rounded-[2rem] border border-border/70 bg-background/85 p-6 text-left shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
					>
						<div class="flex items-start justify-between gap-4">
							<div class={`flex size-12 items-center justify-center rounded-3xl bg-gradient-to-br ${studio.color ?? 'from-amber-400/80 via-orange-500/70 to-rose-500/80'} text-white shadow-md`}>
								<StudioIcon name={studio.icon} class="size-5" />
							</div>
							<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">
								{studio.runtimeStatus}
							</Badge>
						</div>

						<div class="mt-5 space-y-2">
							<div class="flex items-center gap-2">
								<h2 class="text-xl font-semibold">{studio.name}</h2>
								{#if studio.isDefault}
									<Badge class="rounded-full bg-muted px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Default</Badge>
								{/if}
							</div>
							<p class="min-h-[3rem] text-sm leading-6 text-muted-foreground">
								{studio.description ?? 'A persistent Studio for chats, runtime, and integrations.'}
							</p>
						</div>

						<div class="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-muted/50 p-4 text-sm">
							<div>
								<p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Chats</p>
								<p class="mt-1 font-medium">{studio.chatCount}</p>
							</div>
							<div>
								<p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Runtime</p>
								<p class="mt-1 font-medium">{studio.runtimeLabel}</p>
							</div>
						</div>

						{#if studio.chatPreview.length > 0}
							<div class="mt-5 space-y-2">
								<p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recent conversations</p>
								<div class="space-y-2">
									{#each studio.chatPreview as chat (chat.id)}
										<div class="rounded-2xl border border-border/60 bg-background/70 px-3 py-2 text-sm text-muted-foreground">
											{chat.title}
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<div class="mt-6 flex items-center justify-between text-sm font-medium text-foreground">
							<span>Open Studio</span>
							<ArrowRightIcon class="size-4 transition-transform group-hover:translate-x-1" />
						</div>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}
