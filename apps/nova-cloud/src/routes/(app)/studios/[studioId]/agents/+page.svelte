<script lang="ts">
	import BotIcon from '@lucide/svelte/icons/bot';
	import BrainCircuitIcon from '@lucide/svelte/icons/brain-circuit';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import StudioPageShell from '$lib/components/studios/studio-page-shell.svelte';
	import { Badge } from '$lib/components/ui/badge';

	let { data }: { data: any } = $props();

	const enabledSavedSkills = $derived((data.savedSkills ?? []).filter((skill: any) => skill.enabled));
	const readonlyDetectedSkills = $derived((data.detectedSkills ?? []).filter((skill: any) => skill.readonly));
</script>

<StudioPageShell
	class="bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),transparent_28%)]"
	containerClass="max-w-7xl"
>
	<div class="space-y-6">
		<section class="rounded-[2.25rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur sm:p-8">
			<div class="space-y-3">
				<div class="flex flex-wrap items-center gap-2">
					<Badge class="rounded-full bg-muted px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Agents</Badge>
					<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">{data.agentHarnesses.length} harness slots</Badge>
					<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">{enabledSavedSkills.length} saved skills</Badge>
				</div>
				<h1 class="text-3xl font-semibold tracking-tight sm:text-5xl">{data.studio?.name ?? 'Studio'} agents</h1>
				<p class="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
					Manage which agent surfaces belong in this Studio, understand what harnesses are live today, and keep the attached skill system visible to the user instead of hidden inside chat-only flows.
				</p>
			</div>
		</section>

		<div class="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
				<div class="mb-5 flex items-center gap-3">
					<div class="rounded-2xl bg-muted p-3 text-foreground">
						<BotIcon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Harnesses</p>
						<h2 class="text-xl font-semibold">Agent management surfaces</h2>
					</div>
				</div>

				<div class="grid gap-4 md:grid-cols-2">
					{#each data.agentHarnesses as harness (harness.key)}
						<div class="rounded-[1.5rem] border border-border/60 bg-background/75 p-5">
							<div class="flex items-center justify-between gap-3">
								<h3 class="text-lg font-semibold">{harness.title}</h3>
								<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">
									{harness.status}
								</Badge>
							</div>
							<p class="mt-3 text-sm leading-7 text-muted-foreground">{harness.summary}</p>
						</div>
					{/each}
				</div>
			</section>

			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
				<div class="mb-5 flex items-center gap-3">
					<div class="rounded-2xl bg-sky-500/10 p-3 text-sky-700">
						<WrenchIcon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Execution model</p>
						<h2 class="text-xl font-semibold">What is live right now</h2>
					</div>
				</div>

				<div class="space-y-3 text-sm leading-7 text-muted-foreground">
					<div class="rounded-[1.4rem] border border-border/60 bg-background/75 px-4 py-4">
						Codex is the active implementation harness for repo edits, shell execution, and multi-step Studio work inside Nova Cloud today.
					</div>
					<div class="rounded-[1.4rem] border border-border/60 bg-background/75 px-4 py-4">
						Additional harness names are represented here so Studio users have a stable place to manage them as provider wiring and capability policies are added.
					</div>
					<div class="rounded-[1.4rem] border border-border/60 bg-background/75 px-4 py-4">
						Skills and runtime surfaces are already first-class. This page makes that relationship explicit instead of burying it in chat internals.
					</div>
				</div>
			</section>
		</div>

		<div class="grid gap-5 xl:grid-cols-2">
			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
				<div class="mb-5 flex items-center gap-3">
					<div class="rounded-2xl bg-emerald-500/10 p-3 text-emerald-700">
						<BrainCircuitIcon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Saved skills</p>
						<h2 class="text-xl font-semibold">Studio-accessible skill inventory</h2>
					</div>
				</div>

				{#if data.savedSkills?.length > 0}
					<div class="space-y-3">
						{#each data.savedSkills as skill (skill._id ?? skill.id)}
							<div class="rounded-[1.4rem] border border-border/60 bg-background/75 px-4 py-4">
								<div class="flex flex-wrap items-center gap-2">
									<p class="font-medium">{skill.name}</p>
									<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.16em]">
										{skill.enabled ? 'Enabled' : 'Disabled'}
									</Badge>
									<Badge class="rounded-full bg-muted px-3 py-1 text-[11px] tracking-[0.16em] text-muted-foreground">
										{skill.source}
									</Badge>
								</div>
								{#if skill.description}
									<p class="mt-2 text-sm leading-7 text-muted-foreground">{skill.description}</p>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<div class="rounded-[1.4rem] border border-dashed border-border/70 bg-background/70 px-4 py-4 text-sm leading-7 text-muted-foreground">
						No saved skills are registered for this account yet.
					</div>
				{/if}
			</section>

			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
				<div class="mb-5 flex items-center gap-3">
					<div class="rounded-2xl bg-violet-500/10 p-3 text-violet-700">
						<WrenchIcon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Detected folders</p>
						<h2 class="text-xl font-semibold">Readonly skill sources</h2>
					</div>
				</div>

				{#if readonlyDetectedSkills.length > 0}
					<div class="space-y-3">
						{#each readonlyDetectedSkills as skill (skill.id)}
							<div class="rounded-[1.4rem] border border-border/60 bg-background/75 px-4 py-4">
								<div class="flex flex-wrap items-center gap-2">
									<p class="font-medium">{skill.name}</p>
									<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.16em]">
										{skill.source}
									</Badge>
								</div>
								{#if skill.description}
									<p class="mt-2 text-sm leading-7 text-muted-foreground">{skill.description}</p>
								{/if}
								{#if skill.folder_path}
									<p class="mt-3 font-mono text-[11px] text-muted-foreground">{skill.folder_path}</p>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<div class="rounded-[1.4rem] border border-dashed border-border/70 bg-background/70 px-4 py-4 text-sm leading-7 text-muted-foreground">
						No readonly skill folders were detected in the current environment.
					</div>
				{/if}
			</section>
		</div>
	</div>
</StudioPageShell>
