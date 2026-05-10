<script lang="ts">
	import { onMount } from 'svelte';
	import Clock3Icon from '@lucide/svelte/icons/clock-3';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import Layers3Icon from '@lucide/svelte/icons/layers-3';
	import ScrollTextIcon from '@lucide/svelte/icons/scroll-text';
	import PlayIcon from '@lucide/svelte/icons/play';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import SquareIcon from '@lucide/svelte/icons/square';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import ArtifactCard from '$lib/components/studios/artifact-card.svelte';
	import StudioPageShell from '$lib/components/studios/studio-page-shell.svelte';
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
	const workspaceContracts = $derived(data?.workspaces ?? []);
	const availableToolchains = [
		{ label: 'Node.js 22', command: 'node / npm / npx', description: 'Default JavaScript runtime for app and tooling work.' },
		{ label: 'Bun', command: 'bun / bunx', description: 'Fast package install and script execution inside the sandbox.' },
		{ label: 'Python 3', command: 'python3 / pip3', description: 'Package and script support for data or automation tasks.' },
		{ label: 'Go 1.26.1', command: 'go', description: 'Available for compile or CLI-heavy workflows.' },
		{ label: 'Vite+', command: 'vp', description: 'Preferred create, install, build, check, and test workflow.' },
		{ label: 'Agent tooling', command: 'agent-browser / firecrawl / ctx7', description: 'Web automation and current-doc retrieval tools available from the runtime.' },
	];

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

	async function refreshSandbox(showToast = false) {
		const res = await fetch(`/api/sandbox?studioId=${data.studioId}`);
		if (!res.ok) {
			if (showToast) toast.error('Failed to refresh sandbox status');
			return;
		}
		const payload = await res.json();
		runtime = payload.runtime ?? null;
		primaryProcess = payload.primaryProcess ?? null;
		artifacts = payload.artifacts ?? [];
		lastSyncedAt = Date.now();
		if (showToast) toast.success('Sandbox status refreshed');
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
				void refreshSandbox(false);
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
			void refreshSandbox(false);
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
				throw new Error(payload.error || `Failed to ${action} sandbox`);
			}

			if (action === 'start') {
				toast.success('Sandbox wake requested');
			} else if (action === 'stop') {
				toast.success('Sandbox stop requested');
			} else {
				toast.success('Sandbox refresh requested');
			}

			await refreshSandbox(false);
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
			await refreshSandbox(false);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		} finally {
			isMutating = false;
		}
	}
</script>

<svelte:window
	onfocus={() => shouldAutoRefresh && !isMutating && void refreshSandbox(false)}
	onvisibilitychange={() => shouldAutoRefresh && document.visibilityState === 'visible' && !isMutating && void refreshSandbox(false)}
/>

<StudioPageShell
	class="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),transparent_26%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.12),transparent_26%)]"
	containerClass="max-w-7xl"
>
	<div class="space-y-6">
		<section class="rounded-[2rem] border border-border/70 bg-background/85 p-8 shadow-sm backdrop-blur">
			<div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
				<div class="space-y-3">
					<div class="flex flex-wrap items-center gap-2">
						<Badge class="rounded-full bg-muted px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Sandbox control</Badge>
						<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">{runtime?.badgeLabel ?? 'idle'}</Badge>
						<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">
							{studioEventsState === 'connected' ? 'Live updates' : studioEventsState === 'connecting' ? 'Connecting live updates' : 'Polling fallback'}
						</Badge>
					</div>
					<h1 class="text-3xl font-semibold tracking-tight sm:text-5xl">{data.studio?.name ?? 'Studio'} sandbox</h1>
					<p class="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{runtime?.summary ?? 'No sandbox is attached to this Studio yet.'}</p>
				</div>

				<div class="flex flex-wrap gap-3">
					<Button variant="outline" class="rounded-full px-5" disabled={isMutating} onclick={() => mutateRuntime('refresh')}>
						<RotateCcwIcon class="size-4" />
						Refresh
					</Button>
					<Button variant="outline" class="rounded-full px-5" disabled={isMutating || !runtime?.canStart} onclick={() => mutateRuntime('start')}>
						<PlayIcon class="size-4" />
						Wake sandbox
					</Button>
					<Button variant="destructive" class="rounded-full px-5" disabled={isMutating || !runtime?.canStop} onclick={() => mutateRuntime('stop')}>
						<SquareIcon class="size-4" />
						Sleep sandbox
					</Button>
				</div>
			</div>
			<p class="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
				Auto-syncs every 10s while the sandbox or preview is active. Last checked {formatTimestamp(lastSyncedAt)}.
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
						<h2 class="text-lg font-semibold">Sandbox status</h2>
					</div>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<div class="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current state</p>
						<p class="mt-3 text-2xl font-semibold">{runtime?.label ?? 'Sandbox idle'}</p>
					</div>
					<div class="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sandbox id</p>
						<p class="mt-3 break-all text-sm font-medium text-muted-foreground">{runtime?.sandboxId ?? 'No sandbox attached yet'}</p>
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
						<ExternalLinkIcon class="size-5" />
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
						<p>The sandbox owns the live execution environment, mounted files, dev server process, and preview URL for this Studio.</p>
						<p>Once a preview is started from Deployments, this page will show the active process and log stream.</p>
					</div>
				{/if}
			</section>

			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur lg:col-span-2">
				<div class="mb-5 flex items-center gap-3">
					<div class="rounded-2xl bg-sky-500/10 p-3 text-sky-700">
						<FolderIcon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace mount</p>
						<h2 class="text-lg font-semibold">How the sandbox uses Studio storage</h2>
					</div>
				</div>

				<div class="grid gap-4 md:grid-cols-3 text-sm leading-7 text-muted-foreground">
					<p>Studio files persist separately from the sandbox lifecycle, then mount into the workspace whenever the sandbox starts.</p>
					<p>Use this page to control the live environment, keep a preview process running, and inspect what the current sandbox is doing.</p>
					<p>Use Deployments to create workspace contracts, provision build artifacts, and launch previews that this sandbox then hosts.</p>
				</div>
			</section>

			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur lg:col-span-2">
				<div class="mb-5 flex items-center gap-3">
					<div class="rounded-2xl bg-emerald-500/10 p-3 text-emerald-700">
						<Layers3Icon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Toolchains</p>
						<h2 class="text-lg font-semibold">Available packages and runtime surfaces</h2>
					</div>
				</div>

				<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{#each availableToolchains as toolchain (toolchain.label)}
						<div class="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
							<div class="flex flex-wrap items-center gap-2">
								<p class="font-medium">{toolchain.label}</p>
								<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.16em]">
									{toolchain.command}
								</Badge>
							</div>
							<p class="mt-3 text-sm leading-7 text-muted-foreground">{toolchain.description}</p>
						</div>
					{/each}
				</div>
			</section>

			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur lg:col-span-2">
				<div class="mb-5 flex items-center justify-between gap-4">
					<div class="flex items-center gap-3">
						<div class="rounded-2xl bg-violet-500/10 p-3 text-violet-700">
							<WrenchIcon class="size-5" />
						</div>
						<div>
							<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace contracts</p>
							<h2 class="text-lg font-semibold">Install, build, and serve commands in this sandbox</h2>
						</div>
					</div>
					<Button variant="outline" class="rounded-full" href={`/app/studios/${data.studioId}/deployments`}>
						Open deployments
					</Button>
				</div>

				{#if workspaceContracts.length > 0}
					<div class="space-y-4">
						{#each workspaceContracts as workspace (workspace.workspace._id)}
							<div class="rounded-[1.6rem] border border-border/60 bg-background/70 p-5">
								<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
									<div>
										<div class="flex flex-wrap items-center gap-2">
											<p class="text-lg font-semibold">{workspace.workspace.name}</p>
											<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.16em]">
												{workspace.runtimeContract.framework}
											</Badge>
											<Badge class="rounded-full bg-muted px-3 py-1 text-[11px] tracking-[0.16em] text-muted-foreground">
												{workspace.runtimeContract.templateKind}
											</Badge>
										</div>
										<p class="mt-2 text-sm leading-7 text-muted-foreground">
											Source mounts from <span class="font-mono text-[11px] text-foreground">{workspace.runtimeContract.storage.sourcePath}</span> and content mounts from <span class="font-mono text-[11px] text-foreground">{workspace.runtimeContract.storage.contentPath}</span>.
										</p>
									</div>
									<div class="text-sm text-muted-foreground">
										<p>Runtime: <span class="font-medium text-foreground">{workspace.runtimeContract.runtimeKind}</span></p>
										<p>Lifecycle: <span class="font-medium text-foreground">{workspace.runtimeContract.lifecycleMode}</span></p>
									</div>
								</div>

								<div class="mt-5 grid gap-4 xl:grid-cols-2">
									<div class="rounded-[1.35rem] border border-border/60 bg-background/80 p-4">
										<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Install command</p>
										<p class="mt-3 break-all font-mono text-xs leading-6 text-foreground">
											{workspace.runtimeContract.commands.installCommand}
										</p>
									</div>
									<div class="rounded-[1.35rem] border border-border/60 bg-background/80 p-4">
										<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Build command</p>
										<p class="mt-3 break-all font-mono text-xs leading-6 text-foreground">
											{workspace.runtimeContract.commands.buildCommand}
										</p>
									</div>
									<div class="rounded-[1.35rem] border border-border/60 bg-background/80 p-4">
										<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Serve command</p>
										<p class="mt-3 break-all font-mono text-xs leading-6 text-foreground">
											{workspace.runtimeContract.commands.serveCommand}
										</p>
									</div>
									<div class="rounded-[1.35rem] border border-border/60 bg-background/80 p-4">
										<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Preview API</p>
										<p class="mt-3 break-all font-mono text-xs leading-6 text-foreground">
											{workspace.runtimeContract.api.previewPath}
										</p>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="rounded-[1.5rem] border border-dashed border-border/70 bg-background/70 p-4 text-sm leading-7 text-muted-foreground">
						No workspace contracts exist yet. Create the first deployment workspace, then this page will show the exact package, build, and serve workflow the sandbox can host.
					</div>
				{/if}
			</section>
		</div>
	</div>
</StudioPageShell>
