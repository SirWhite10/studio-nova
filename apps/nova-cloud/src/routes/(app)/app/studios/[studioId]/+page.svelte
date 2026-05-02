<script lang="ts">
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import Clock3Icon from '@lucide/svelte/icons/clock-3';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import MessageSquareIcon from '@lucide/svelte/icons/message-square';
	import PlugZapIcon from '@lucide/svelte/icons/plug-zap';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import StudioIcon from '$lib/components/studios/studio-icon.svelte';
	import ArtifactCard from '$lib/components/studios/artifact-card.svelte';
	import { planDisplayMessage } from '$lib/studios/constants';
	import { chatStore } from '$lib/nova/chat';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { runtimeToneClass } from '$lib/studios/runtime-state';
	import { toast } from 'svelte-sonner';

	let { data }: { data: any } = $props();

	let chats = $state.raw(data.chats ?? []);
	let runtime = $state.raw(data.runtime);
	let integrations = $state.raw(data.integrations ?? []);
	let recentArtifacts = $state.raw(data.artifacts ?? []);
	let recentRuns = $state.raw(data.runs ?? []);
	let workspaces = $state.raw(data.workspaces ?? []);
	let studioPlan = $state.raw(data.studioPlan);
	let isRefreshingOverview = $state(false);
	let isCreatingWorkspace = $state(false);
	let workspaceActionById = $state<Record<string, string>>({});
	const enabledIntegrations = $derived((integrations ?? []).filter((integration: any) => integration.enabled));
	const suggestedIntegrations = $derived((integrations ?? []).filter((integration: any) => !integration.enabled));
	const chatTitleById = $derived(new Map((chats ?? []).map((chat: any) => [chat.id, chat.title])));
	let isCreatingChat = $state(false);
	let directTaskInput = $state('');
	let isStartingDirectTask = $state(false);

	async function refreshOverview(showToast = false) {
		if (isRefreshingOverview) return;
		isRefreshingOverview = true;
		try {
			const res = await fetch(`/api/studios/${data.studio._id}/overview-state`);
			if (!res.ok) {
				if (showToast) toast.error('Failed to refresh Studio state');
				return;
			}
			const payload = await res.json();
			chats = payload.chats ?? chats;
			runtime = payload.runtime ?? runtime;
			integrations = payload.integrations ?? integrations;
			recentArtifacts = payload.artifacts ?? recentArtifacts;
			recentRuns = payload.runs ?? recentRuns;
			workspaces = payload.workspaces ?? workspaces;
			studioPlan = payload.studioPlan ?? studioPlan;
			if (showToast) toast.success('Studio refreshed');
		} finally {
			isRefreshingOverview = false;
		}
	}

	async function createChat() {
		if (isCreatingChat) return;
		isCreatingChat = true;
		try {
			await chatStore.createChatForStudio(data.studio._id);
		} finally {
			isCreatingChat = false;
		}
	}

	async function enableIntegration(key: string) {
		const res = await fetch(`/api/studios/${data.studio._id}/integrations/${key}`, { method: 'POST' });
		if (!res.ok) {
			toast.error('Failed to enable integration');
			return;
		}
		toast.success('Integration enabled');
		await refreshOverview(false);
	}

	async function mutateRuntime(action: 'start' | 'stop' | 'refresh') {
		const res = await fetch('/api/sandbox', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action, studioId: data.studio._id }),
		});
		if (!res.ok) {
			const payload = await res.json().catch(() => ({}));
			toast.error(payload.error || `Failed to ${action} runtime`);
			return;
		}
		toast.success(action === 'start' ? 'Runtime wake requested' : action === 'stop' ? 'Runtime sleep requested' : 'Runtime refresh requested');
		await refreshOverview(false);
	}

	async function startDirectTask() {
		const content = directTaskInput.trim();
		if (!content || isStartingDirectTask) return;
		isStartingDirectTask = true;
		try {
			const res = await fetch(`/api/studios/${data.studio._id}/jobs`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content, trigger: 'direct' }),
			});
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) {
				toast.error(payload.error || 'Failed to start direct task');
				return;
			}
			directTaskInput = '';
			toast.success('Direct task started');
			await refreshOverview(false);
		} finally {
			isStartingDirectTask = false;
		}
	}

	async function createWorkspace() {
		if (isCreatingWorkspace) return;
		isCreatingWorkspace = true;
		try {
			const res = await fetch(`/api/studios/${data.studio._id}/workspaces`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: `${data.studio.name} Blog`,
					templateKind: 'blog-react-vp',
					framework: 'react'
				})
			});
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) {
				toast.error(payload.error || 'Failed to create workspace');
				return;
			}
			toast.success('Workspace contract created');
			await refreshOverview(false);
		} finally {
			isCreatingWorkspace = false;
		}
	}

	async function runWorkspaceAction(
		workspaceId: string,
		action: 'provision' | 'preview'
	) {
		if (workspaceActionById[workspaceId]) return;
		workspaceActionById = { ...workspaceActionById, [workspaceId]: action };
		try {
			const res = await fetch(`/api/studios/${data.studio._id}/workspaces/${workspaceId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action })
			});
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) {
				toast.error(payload.error || `Failed to ${action} workspace`);
				return;
			}
			toast.success(action === 'preview' ? 'Workspace preview started' : 'Workspace provisioned');
			await refreshOverview(false);
		} finally {
			const next = { ...workspaceActionById };
			delete next[workspaceId];
			workspaceActionById = next;
		}
	}

	const runtimeTone = $derived(runtimeToneClass(runtime.tone));

	function runStatusTone(status: string) {
		switch (status) {
			case 'completed':
				return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700';
			case 'failed':
				return 'border-destructive/25 bg-destructive/10 text-destructive';
			case 'aborted':
				return 'border-border/70 bg-muted text-muted-foreground';
			default:
				return 'border-sky-500/25 bg-sky-500/10 text-sky-700';
		}
	}

	function runTriggerLabel(trigger?: string | null) {
		if (trigger === 'schedule') return 'Scheduled';
		if (trigger === 'direct') return 'Direct task';
		return 'Chat request';
	}

	function runDuration(run: any) {
		if (!run?.startedAt || !run?.endedAt) return 'In progress';
		const ms = Math.max(0, run.endedAt - run.startedAt);
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
		return `${Math.round(ms / 1000)}s`;
	}

	onMount(() => {
		const studioId = data.studio?._id;
		if (!studioId) return;

		const source = new EventSource(`/api/studios/${studioId}/events/stream`);
		const refresh = () => {
			void refreshOverview(false);
		};

		for (const eventName of ['runtime.status', 'runtime.preview', 'artifact.upserted', 'deploy.updated', 'job.updated', 'job.run-started', 'job.run-failed']) {
			source.addEventListener(eventName, refresh);
		}

		source.onerror = () => {
			source.close();
		};

		return () => {
			source.close();
		};
	});
</script>

<div class="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.12),transparent_26%)] px-6 py-8 sm:px-10">
	<div class="mx-auto flex max-w-7xl flex-col gap-6">
		<section class="rounded-[2.25rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur sm:p-8">
			<div class="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
				<div class="flex items-start gap-5">
					<div class={`flex size-18 items-center justify-center rounded-[1.9rem] bg-gradient-to-br ${data.studio.color ?? 'from-amber-400/80 via-orange-500/70 to-rose-500/80'} text-white shadow-xl`}>
						<StudioIcon name={data.studio.icon} class="size-8" />
					</div>
					<div class="space-y-3">
						<div class="flex flex-wrap items-center gap-2">
							<Badge class="rounded-full bg-muted px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Studio overview</Badge>
							<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">{runtime.badgeLabel}</Badge>
							{#if data.studio.isDefault}
								<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">Default</Badge>
							{/if}
						</div>
						<div class="space-y-2">
							<h1 class="text-3xl font-semibold tracking-tight sm:text-5xl">{data.studio.name}</h1>
							<p class="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
								{data.studio.description ?? 'A Studio collects your chats, runtime, and Integrations into one persistent environment.'}
							</p>
						</div>
					</div>
				</div>

				<div class="flex flex-wrap gap-3">
					<Button variant="outline" class="rounded-full px-5" href={`/app/studios/${data.studio._id}/runtime`}>
						Open runtime
					</Button>
					<Button class="rounded-full px-5" onclick={createChat} disabled={isCreatingChat}>
						{isCreatingChat ? 'Creating chat...' : 'New chat'}
					</Button>
				</div>
			</div>

			<div class="mt-8 grid gap-4 md:grid-cols-3">
				<div class="rounded-[1.75rem] border border-border/60 bg-background/80 p-5">
					<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Conversations</p>
					<p class="mt-3 text-3xl font-semibold">{chats.length}</p>
					<p class="mt-2 text-sm leading-6 text-muted-foreground">Chats now route through the selected Studio instead of a global chat shell.</p>
				</div>
				<div class="rounded-[1.75rem] border border-border/60 bg-background/80 p-5">
					<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Integrations</p>
					<p class="mt-3 text-3xl font-semibold">{enabledIntegrations.length}</p>
					<p class="mt-2 text-sm leading-6 text-muted-foreground">Enabled integrations show up in the sidebar under this Studio's Integrations group.</p>
				</div>
				<div class="rounded-[1.75rem] border border-border/60 bg-background/80 p-5">
					<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Plan</p>
					<p class="mt-3 text-xl font-semibold">{studioPlan.label}</p>
					<p class="mt-2 text-sm leading-6 text-muted-foreground">{planDisplayMessage(studioPlan.plan)}</p>
				</div>
			</div>
		</section>

		<div class="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
				<div class="mb-5 flex items-center justify-between gap-4">
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Chats</p>
						<h2 class="text-2xl font-semibold">Recent conversations</h2>
					</div>
					<Button variant="ghost" class="rounded-full" onclick={() => goto(`/app/chats?studio=${data.studio._id}`)}>
						See all
					</Button>
				</div>

				{#if chats.length === 0}
					<div class="rounded-[1.5rem] border border-dashed border-border/80 bg-muted/40 px-5 py-10 text-center text-sm text-muted-foreground">
						No conversations yet. Start the first Studio-scoped chat to build history here.
					</div>
				{:else}
					<div class="space-y-3">
						{#each chats as chat (chat.id)}
							<a href={chat.url} class="group flex items-center justify-between rounded-[1.5rem] border border-border/60 bg-background/70 px-4 py-4 transition-colors hover:bg-muted/40">
								<div class="flex min-w-0 items-center gap-3">
									<div class="rounded-2xl bg-muted p-2 text-muted-foreground">
										<MessageSquareIcon class="size-4" />
									</div>
									<div class="min-w-0">
										<p class="truncate font-medium">{chat.title}</p>
										<p class="text-sm text-muted-foreground">Updated {new Date(chat.updatedAt).toLocaleString()}</p>
									</div>
								</div>
								<ArrowRightIcon class="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
							</a>
						{/each}
					</div>
				{/if}
			</section>

			<div class="space-y-5">
				<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
					<div class="mb-4 flex items-center gap-3">
						<div class={`rounded-2xl bg-muted p-3 ${runtimeTone}`}>
							<WrenchIcon class="size-5" />
						</div>
					<div>
							<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Runtime</p>
							<h2 class="text-lg font-semibold">Studio runtime</h2>
						</div>
					</div>
					<p class="text-sm leading-7 text-muted-foreground">{runtime.summary}</p>
					<div class="mt-4 flex flex-wrap gap-3">
						<Button variant="outline" size="sm" class="rounded-full" onclick={() => mutateRuntime('refresh')}>
							Refresh
						</Button>
						<Button variant="outline" size="sm" class="rounded-full" disabled={!runtime.canStart} onclick={() => mutateRuntime('start')}>
							Wake runtime
						</Button>
						<Button variant="destructive" size="sm" class="rounded-full" disabled={!runtime.canStop} onclick={() => mutateRuntime('stop')}>
							Sleep runtime
						</Button>
					</div>
				</section>

				<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
					<div class="mb-5 flex items-center gap-3">
						<div class="rounded-2xl bg-emerald-500/10 p-3 text-emerald-700">
							<GlobeIcon class="size-5" />
						</div>
						<div class="flex-1">
							<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspaces</p>
							<h2 class="text-lg font-semibold">Deployable apps</h2>
						</div>
						<Button size="sm" class="rounded-full" onclick={createWorkspace} disabled={isCreatingWorkspace}>
							{isCreatingWorkspace ? 'Creating...' : 'Create blog workspace'}
						</Button>
					</div>

					{#if workspaces.length > 0}
						<div class="space-y-3">
							{#each workspaces as workspace (workspace._id)}
								<div class="rounded-[1.5rem] border border-border/60 bg-background/70 px-4 py-4">
									<div class="flex items-start justify-between gap-3">
										<div class="min-w-0">
											<p class="truncate font-medium">{workspace.name}</p>
											<p class="text-sm text-muted-foreground">{workspace.framework} · {workspace.templateKind}</p>
										</div>
										<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">
											{workspace.status}
										</Badge>
									</div>
									<div class="mt-3 space-y-1 text-xs leading-6 text-muted-foreground">
										<p>Host: {workspace.defaultHost ?? 'pending'}</p>
										<p>Source: {workspace.sourcePath}</p>
										<p>Build: {workspace.buildPath}</p>
									</div>
									<div class="mt-4 flex flex-wrap gap-2">
										<Button
											variant="outline"
											size="sm"
											class="rounded-full"
											onclick={() => runWorkspaceAction(workspace._id, 'provision')}
											disabled={!!workspaceActionById[workspace._id]}
										>
											{workspaceActionById[workspace._id] === 'provision' ? 'Provisioning...' : 'Provision'}
										</Button>
										<Button
											variant="outline"
											size="sm"
											class="rounded-full"
											onclick={() => runWorkspaceAction(workspace._id, 'preview')}
											disabled={!!workspaceActionById[workspace._id]}
										>
											{workspaceActionById[workspace._id] === 'preview' ? 'Starting...' : 'Start preview'}
										</Button>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm leading-7 text-muted-foreground">
							Create the first workspace contract for this Studio. The sandbox will own the React `vp` project and the workspace runtime will serve its built output.
						</p>
					{/if}
				</section>

				<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
					<div class="mb-5 flex items-center gap-3">
						<div class="rounded-2xl bg-sky-500/10 p-3 text-sky-700">
							<SparklesIcon class="size-5" />
						</div>
						<div>
							<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Artifacts</p>
							<h2 class="text-lg font-semibold">Recent outputs</h2>
						</div>
					</div>

					{#if recentArtifacts.length > 0}
						<div class="space-y-3">
							{#each recentArtifacts as artifact (artifact._id)}
								<ArtifactCard artifact={artifact} compact={true} />
							{/each}
						</div>
					{:else}
						<p class="text-sm leading-7 text-muted-foreground">
							Files, previews, generated outputs, and future deployments will surface here as the Studio produces them.
						</p>
					{/if}
				</section>

				<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
					<div class="mb-5 flex items-center gap-3">
						<div class="rounded-2xl bg-violet-500/10 p-3 text-violet-700">
							<Clock3Icon class="size-5" />
						</div>
						<div>
							<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Execution history</p>
							<h2 class="text-lg font-semibold">Recent agent work</h2>
						</div>
					</div>

					<div class="mb-5 rounded-[1.5rem] border border-dashed border-border/80 bg-muted/25 p-4">
						<label class="text-xs uppercase tracking-[0.2em] text-muted-foreground" for="direct-task">Start a direct task</label>
						<div class="mt-3 flex flex-col gap-3 sm:flex-row">
							<textarea
								id="direct-task"
								class="min-h-20 flex-1 resize-none rounded-2xl border border-border/70 bg-background/90 px-4 py-3 text-sm outline-hidden transition-colors focus:border-primary"
								placeholder="Ask Nova to handle a background Studio task..."
								bind:value={directTaskInput}
							></textarea>
							<Button class="rounded-full sm:self-end" disabled={!directTaskInput.trim() || isStartingDirectTask} onclick={startDirectTask}>
								{isStartingDirectTask ? 'Starting...' : 'Start task'}
							</Button>
						</div>
						<p class="mt-3 text-xs leading-6 text-muted-foreground">
							Direct tasks run through the same agent runtime and appear in this execution history. Scheduled jobs will call the same server path when cron scheduling lands.
						</p>
					</div>

					{#if recentRuns.length > 0}
						<div class="space-y-3">
							{#each recentRuns as run (run._id)}
								<div class="rounded-[1.25rem] border border-border/60 bg-background/75 p-4">
									<div class="flex items-start justify-between gap-4">
										<div class="min-w-0">
											<div class="flex flex-wrap items-center gap-2">
												<span class={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${runStatusTone(run.status)}`}>
													{run.status}
												</span>
												<span class="rounded-full border border-border/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
													{runTriggerLabel(run.trigger)}
												</span>
											</div>
											<p class="mt-3 font-medium">
												{chatTitleById.get(run.chatId) ?? 'Studio run'}
											</p>
											<p class="mt-1 text-sm text-muted-foreground">
												Started {new Date(run.startedAt).toLocaleString()} • {runDuration(run)}
											</p>
											{#if run.error}
												<p class="mt-2 text-sm text-destructive">{run.error}</p>
											{/if}
										</div>
										<a
											class="shrink-0 rounded-full border border-border/70 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
											href={`/app/studios/${data.studio._id}/chat/${run.chatId}`}
										>
											Open chat
										</a>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm leading-7 text-muted-foreground">
							Studio execution history will appear here as Nova handles chat requests, direct tasks, and future scheduled jobs.
						</p>
					{/if}
				</section>

				<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
					<div class="mb-5 flex items-center gap-3">
						<div class="rounded-2xl bg-emerald-500/10 p-3 text-emerald-700">
							<PlugZapIcon class="size-5" />
						</div>
						<div>
							<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Integrations</p>
							<h2 class="text-lg font-semibold">Connected capabilities</h2>
						</div>
					</div>

					{#if enabledIntegrations.length > 0}
						<div class="space-y-3">
							{#each enabledIntegrations as integration (integration._id)}
								<a href={`/app/studios/${data.studio._id}/integrations/${integration.key}`} class="flex items-center justify-between rounded-[1.25rem] border border-border/60 bg-background/75 px-4 py-3 transition-colors hover:bg-muted/40">
									<div class="flex items-center gap-3">
										<div class="rounded-2xl bg-muted p-2 text-muted-foreground">
											<PlugZapIcon class="size-4" />
										</div>
										<div>
											<p class="font-medium">{integration.title}</p>
											<p class="text-sm text-muted-foreground">Visible in the Studio sidebar</p>
										</div>
									</div>
									<ArrowRightIcon class="size-4 text-muted-foreground" />
								</a>
							{/each}
						</div>
					{:else}
						<p class="text-sm leading-7 text-muted-foreground">
							No Integrations are enabled yet. When you connect something like Stripe or GitHub, it will appear here and in the sidebar.
						</p>
					{/if}

					{#if suggestedIntegrations.length > 0}
						<div class="mt-5 border-t border-border/60 pt-5">
							<p class="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Available next</p>
							<div class="space-y-3">
								{#each suggestedIntegrations as integration (integration._id)}
									<div class="flex items-center justify-between rounded-[1.25rem] border border-dashed border-border/80 bg-muted/25 px-4 py-3">
										<div>
											<p class="font-medium">{integration.title}</p>
											<p class="text-sm text-muted-foreground">Enable this integration for Studio-scoped navigation and actions.</p>
										</div>
										<Button size="sm" class="rounded-full" onclick={() => enableIntegration(integration.key)}>
											Enable
										</Button>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</section>

				<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
					<div class="mb-4 flex items-center gap-3">
						<div class="rounded-2xl bg-amber-500/10 p-3 text-amber-700">
							<Clock3Icon class="size-5" />
						</div>
						<div>
							<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Momentum</p>
							<h2 class="text-lg font-semibold">What this Studio is ready for</h2>
						</div>
					</div>
					<div class="space-y-3 text-sm leading-7 text-muted-foreground">
						<p class="flex items-start gap-2"><SparklesIcon class="mt-1 size-4 shrink-0 text-foreground" />Focused conversations with context tied to one persistent Studio.</p>
						<p class="flex items-start gap-2"><WrenchIcon class="mt-1 size-4 shrink-0 text-foreground" />Runtime surfaces that can later expose previews, wake controls, and execution history.</p>
						<p class="flex items-start gap-2"><PlugZapIcon class="mt-1 size-4 shrink-0 text-foreground" />Dynamic Integrations that appear only when enabled for this Studio.</p>
					</div>
				</section>
			</div>
		</div>
	</div>
</div>
