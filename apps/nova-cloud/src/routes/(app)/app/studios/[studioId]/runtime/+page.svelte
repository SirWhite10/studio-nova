<script lang="ts">
	import { onMount } from 'svelte';
	import Clock3Icon from '@lucide/svelte/icons/clock-3';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import ScrollTextIcon from '@lucide/svelte/icons/scroll-text';
	import PlayIcon from '@lucide/svelte/icons/play';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import SquareIcon from '@lucide/svelte/icons/square';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import ArtifactCard from '$lib/components/studios/artifact-card.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { runtimeToneClass } from '$lib/studios/runtime-state';
	import { toast } from 'svelte-sonner';

	let { data }: { data: any } = $props();

	let runtime = $state(data?.runtime ?? null);
	let primaryProcess = $state(data?.primaryProcess ?? null);
	let artifacts = $state(data?.artifacts ?? []);
	let isMutating = $state(false);
	let lastSyncedAt = $state(Date.now());
	let studioEventsState = $state<'connecting' | 'connected' | 'fallback'>('connecting');

	const statusTone = $derived(runtimeToneClass(runtime?.tone ?? 'muted'));
	const shouldAutoRefresh = $derived(
		runtime?.status === 'active' ||
			runtime?.status === 'waking' ||
			primaryProcess?.status === 'running' ||
			primaryProcess?.status === 'starting',
	);

	function formatTimestamp(value?: number | null) {
		if (!value) return 'Not available';
		return new Date(value).toLocaleString();
	}

	async function refreshRuntime(showToast = false) {
		const res = await fetch(`/api/sandbox?studioId=${data.studioId}`);
		if (!res.ok) {
			if (showToast) toast.error('Failed to refresh runtime status');
			return;
		}
		const payload = await res.json();
		runtime = payload.runtime ?? null;
		primaryProcess = payload.primaryProcess ?? null;
		artifacts = payload.artifacts ?? [];
		lastSyncedAt = Date.now();
		if (showToast) toast.success('Runtime status refreshed');
	}

	onMount(() => {
		let source: EventSource | null = null;
		let reconnectTimer: number | null = null;

		const connectStudioEvents = () => {
			if (reconnectTimer) {
				window.clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
			source?.close();
			studioEventsState = 'connecting';
			source = new EventSource(`/api/studios/${data.studioId}/events/stream`);

			source.addEventListener('ready', () => {
				studioEventsState = 'connected';
			});

			const refreshFromEvent = () => {
				if (document.visibilityState !== 'visible' || isMutating) return;
				void refreshRuntime(false);
			};

			for (const eventName of ['runtime.status', 'runtime.preview', 'artifact.upserted', 'deploy.updated']) {
				source.addEventListener(eventName, refreshFromEvent);
			}

			source.onerror = () => {
				source?.close();
				source = null;
				studioEventsState = 'fallback';
				if (!reconnectTimer) {
					reconnectTimer = window.setTimeout(() => {
						reconnectTimer = null;
						connectStudioEvents();
					}, 15000);
				}
			};
		};

		connectStudioEvents();

		const interval = window.setInterval(() => {
			if (
				studioEventsState === 'connected' ||
				!shouldAutoRefresh ||
				document.visibilityState !== 'visible' ||
				isMutating
			) {
				return;
			}
			void refreshRuntime(false);
		}, 10000);

		return () => {
			if (reconnectTimer) window.clearTimeout(reconnectTimer);
			source?.close();
			window.clearInterval(interval);
		};
	});

	async function mutateRuntime(action: 'start' | 'stop' | 'refresh') {
		isMutating = true;
		try {
			const res = await fetch('/api/sandbox', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action, studioId: data.studioId }),
			});

			if (!res.ok) {
				const payload = await res.json().catch(() => ({}));
				throw new Error(payload.error || `Failed to ${action} runtime`);
			}

			if (action === 'start') {
				toast.success('Runtime wake requested');
			} else if (action === 'stop') {
				toast.success('Runtime stop requested');
			} else {
				toast.success('Runtime refresh requested');
			}

			await refreshRuntime(false);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		} finally {
			isMutating = false;
		}
	}

	async function runPreviewAction(action: 'refresh-logs' | 'stop-preview') {
		if (!primaryProcess) return;
		isMutating = true;
		try {
			const endpoint = action === 'refresh-logs' ? 'runtime_dev_logs' : 'runtime_dev_stop';
			const res = await fetch('/api/internal/runtime-tools', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					studioId: data.studioId,
					toolName: endpoint,
					input: { pid: primaryProcess.pid },
				}),
			});

			if (!res.ok) {
				const payload = await res.json().catch(() => ({}));
				throw new Error(payload.error || `Failed to ${action}`);
			}

			toast.success(action === 'refresh-logs' ? 'Preview logs refreshed' : 'Preview stopped');
			await refreshRuntime(false);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		} finally {
			isMutating = false;
		}
	}
</script>

<svelte:window
	onfocus={() => shouldAutoRefresh && !isMutating && void refreshRuntime(false)}
	onvisibilitychange={() => shouldAutoRefresh && document.visibilityState === 'visible' && !isMutating && void refreshRuntime(false)}
/>

<div class="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),transparent_26%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.12),transparent_26%)] px-6 py-8 sm:px-10">
	<div class="mx-auto max-w-5xl space-y-6">
		<section class="rounded-[2rem] border border-border/70 bg-background/85 p-8 shadow-sm backdrop-blur">
			<div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
				<div class="space-y-3">
					<div class="flex flex-wrap items-center gap-2">
						<Badge class="rounded-full bg-muted px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Runtime control</Badge>
						<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">{runtime?.badgeLabel ?? 'idle'}</Badge>
						<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">
							{studioEventsState === 'connected' ? 'Live updates' : studioEventsState === 'connecting' ? 'Connecting live updates' : 'Polling fallback'}
						</Badge>
					</div>
					<h1 class="text-3xl font-semibold tracking-tight sm:text-5xl">{data.studio?.name ?? 'Studio'} runtime</h1>
					<p class="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{runtime?.summary ?? 'No runtime is attached to this Studio yet.'}</p>
				</div>

				<div class="flex flex-wrap gap-3">
					<Button variant="outline" class="rounded-full px-5" disabled={isMutating} onclick={() => mutateRuntime('refresh')}>
						<RotateCcwIcon class="size-4" />
						Refresh
					</Button>
					<Button variant="outline" class="rounded-full px-5" disabled={isMutating || !runtime?.canStart} onclick={() => mutateRuntime('start')}>
						<PlayIcon class="size-4" />
						Wake runtime
					</Button>
					<Button variant="destructive" class="rounded-full px-5" disabled={isMutating || !runtime?.canStop} onclick={() => mutateRuntime('stop')}>
						<SquareIcon class="size-4" />
						Sleep runtime
					</Button>
				</div>
			</div>
			<p class="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
				Auto-syncs every 10s while the runtime or preview is active. Last checked {formatTimestamp(lastSyncedAt)}.
			</p>
		</section>

		<div class="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
				<div class="mb-5 flex items-center gap-3">
					<div class={`rounded-2xl bg-muted p-3 ${statusTone}`}>
						<WrenchIcon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Health</p>
						<h2 class="text-lg font-semibold">Runtime status</h2>
					</div>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<div class="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current state</p>
						<p class="mt-3 text-2xl font-semibold">{runtime?.label ?? 'Runtime idle'}</p>
					</div>
					<div class="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sandbox id</p>
						<p class="mt-3 break-all text-sm font-medium text-muted-foreground">{runtime?.sandboxId ?? 'No runtime attached yet'}</p>
					</div>
					<div class="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Last used</p>
						<p class="mt-3 text-sm font-medium">{formatTimestamp(runtime?.lastUsedAt)}</p>
					</div>
					<div class="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Expires</p>
						<p class="mt-3 text-sm font-medium">{formatTimestamp(runtime?.expiresAt)}</p>
					</div>
				</div>
			</section>

			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
				<div class="mb-5 flex items-center gap-3">
					<div class="rounded-2xl bg-amber-500/10 p-3 text-amber-700">
						<GlobeIcon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Primary preview</p>
						<h2 class="text-lg font-semibold">One active Studio preview</h2>
					</div>
				</div>

				{#if primaryProcess}
					<div class="space-y-4">
						{#if artifacts.length > 0}
							<div class="space-y-3">
								{#each artifacts as artifact (artifact._id)}
									<ArtifactCard artifact={artifact} />
								{/each}
							</div>
						{/if}

						<div class="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
							<div class="flex items-start justify-between gap-4">
								<div>
									<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</p>
									<p class="mt-2 text-lg font-semibold capitalize">{primaryProcess.status}</p>
									<p class="mt-2 text-sm text-muted-foreground">{primaryProcess.label}</p>
								</div>
								{#if primaryProcess.previewUrl}
									<a class="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-2 text-sm font-medium hover:bg-muted" href={primaryProcess.previewUrl} target="_blank" rel="noreferrer">
										<ExternalLinkIcon class="size-4" />
										Open preview
									</a>
								{/if}
							</div>
							<div class="mt-4 flex flex-wrap gap-3">
								<Button variant="outline" class="rounded-full" disabled={isMutating} onclick={() => runPreviewAction('refresh-logs')}>
									<RotateCcwIcon class="size-4" />
									Refresh logs
								</Button>
								<Button variant="destructive" class="rounded-full" disabled={isMutating || primaryProcess.status !== 'running'} onclick={() => runPreviewAction('stop-preview')}>
									<SquareIcon class="size-4" />
									Stop preview
								</Button>
							</div>
						</div>

						<div class="grid gap-4 sm:grid-cols-2">
							<div class="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
								<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Command</p>
								<p class="mt-3 break-all text-sm font-medium">{primaryProcess.command}</p>
							</div>
							<div class="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
								<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Working directory</p>
								<p class="mt-3 break-all text-sm font-medium">{primaryProcess.cwd}</p>
							</div>
							<div class="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
								<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">PID / Port</p>
								<p class="mt-3 text-sm font-medium">{primaryProcess.pid}{primaryProcess.port ? ` / ${primaryProcess.port}` : ''}</p>
							</div>
							<div class="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
								<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Updated</p>
								<p class="mt-3 text-sm font-medium">{formatTimestamp(primaryProcess.updatedAt)}</p>
							</div>
						</div>

						<div class="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
							<div class="mb-3 flex items-center gap-2">
								<ScrollTextIcon class="size-4 text-muted-foreground" />
								<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Recent logs</p>
							</div>
							<p class="whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">{primaryProcess.logSummary ?? 'No logs captured yet.'}</p>
						</div>
					</div>
				{:else}
					<div class="space-y-3 text-sm leading-7 text-muted-foreground">
						<p>No primary preview is registered for this Studio yet.</p>
						<p>Nova can now use structured runtime tools to scaffold a project, start one primary dev server, capture logs, and expose a preview URL.</p>
						<p>This page will automatically reflect that single active preview once it is started.</p>
						{#if artifacts.length > 0}
							<div class="pt-2">
								{#each artifacts as artifact (artifact._id)}
									<ArtifactCard artifact={artifact} />
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</section>

			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur lg:col-span-2">
				<div class="mb-5 flex items-center gap-3">
					<div class="rounded-2xl bg-amber-500/10 p-3 text-amber-700">
						<Clock3Icon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workflow</p>
						<h2 class="text-lg font-semibold">How Nova should use this runtime</h2>
					</div>
				</div>

				<div class="grid gap-4 md:grid-cols-3 text-sm leading-7 text-muted-foreground">
					<p>Use `runtime_svelte_create` or `runtime_vite_create` when a Studio needs a fresh project scaffold instead of composing raw shell commands by hand.</p>
					<p>Use `runtime_dev_start` to launch one primary preview, then `runtime_preview_status` and `runtime_dev_logs` to inspect it without guessing process ids.</p>
					<p>Use `runtime_dev_stop` before replacing a running preview. The first pass intentionally refuses automatic replacement to avoid accidental teardown.</p>
				</div>
			</section>
		</div>
	</div>
</div>
