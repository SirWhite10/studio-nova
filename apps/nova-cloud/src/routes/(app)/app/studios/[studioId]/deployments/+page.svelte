<script lang="ts">
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import Layers3Icon from '@lucide/svelte/icons/layers-3';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import RocketIcon from '@lucide/svelte/icons/rocket';
	import StudioPageShell from '$lib/components/studios/studio-page-shell.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { runtimeToneClass } from '$lib/studios/runtime-state';
	import { toast } from 'svelte-sonner';

	let { data }: { data: any } = $props();

	let workspaces = $state.raw(data.workspaces ?? []);
	let runtime = $state.raw(data.runtime ?? null);
	let isRefreshing = $state(false);
	let isCreatingWorkspace = $state(false);
	let workspaceActionById = $state<Record<string, string>>({});

	const runtimeTone = $derived(runtimeToneClass(runtime?.tone ?? 'muted'));
	const activeDeployments = $derived(
		(workspaces ?? []).filter((workspace: any) => workspace.deployment?.status === 'active').length,
	);

	function workspaceDeploymentBadge(status?: string | null) {
		if (status === 'active') return 'Active';
		if (status === 'ready') return 'Ready';
		if (status === 'building') return 'Building';
		if (status === 'failed') return 'Failed';
		return 'Pending';
	}

	function workspaceDeploymentTone(status?: string | null) {
		switch (status) {
			case 'active':
			case 'ready':
				return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700';
			case 'building':
				return 'border-sky-500/25 bg-sky-500/10 text-sky-700';
			case 'failed':
				return 'border-destructive/25 bg-destructive/10 text-destructive';
			default:
				return 'border-border/70 bg-muted text-muted-foreground';
		}
	}

	function workspaceCanPreview(workspace: any) {
		return workspace?.workspace?.status === 'published' || workspace?.deployment?.status === 'active';
	}

	async function refreshDeployments(showToast = false) {
		if (isRefreshing) return;
		isRefreshing = true;
		try {
			const res = await fetch(`/api/studios/${data.studioId}/overview-state`);
			if (!res.ok) {
				if (showToast) toast.error('Failed to refresh deployments');
				return;
			}
			const payload = await res.json();
			workspaces = payload.workspaces ?? workspaces;
			runtime = payload.runtime ?? runtime;
			if (showToast) toast.success('Deployments refreshed');
		} finally {
			isRefreshing = false;
		}
	}

	async function createWorkspace() {
		if (isCreatingWorkspace) return;
		isCreatingWorkspace = true;
		try {
			const res = await fetch(`/api/studios/${data.studio?._id ?? data.studioId}/workspaces`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: `${data.studio?.name ?? 'Studio'} Blog`,
					templateKind: 'blog-react-vp',
					framework: 'react',
				}),
			});
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) {
				toast.error(payload.error || 'Failed to create workspace');
				return;
			}
			toast.success('Workspace contract created');
			await refreshDeployments(false);
		} finally {
			isCreatingWorkspace = false;
		}
	}

	async function runWorkspaceAction(workspaceId: string, action: 'provision' | 'preview') {
		if (workspaceActionById[workspaceId]) return;
		workspaceActionById = { ...workspaceActionById, [workspaceId]: action };
		try {
			const res = await fetch(`/api/studios/${data.studio?._id ?? data.studioId}/workspaces/${workspaceId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action }),
			});
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) {
				toast.error(payload.error || `Failed to ${action} workspace`);
				return;
			}
			toast.success(action === 'preview' ? 'Workspace preview started' : 'Workspace provisioned');
			await refreshDeployments(false);
		} finally {
			const next = { ...workspaceActionById };
			delete next[workspaceId];
			workspaceActionById = next;
		}
	}
</script>

<StudioPageShell
	class="bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.12),transparent_28%)]"
	containerClass="max-w-7xl"
>
	<div class="space-y-6">
		<section class="rounded-[2.25rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur sm:p-8">
			<div class="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
				<div class="space-y-3">
					<div class="flex flex-wrap items-center gap-2">
						<Badge class="rounded-full bg-muted px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Deployments</Badge>
						<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">{workspaces.length} workspaces</Badge>
						<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">{activeDeployments} active</Badge>
					</div>
					<div>
						<h1 class="text-3xl font-semibold tracking-tight sm:text-5xl">{data.studio?.name ?? 'Studio'} deployments</h1>
						<p class="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
							Manage deployable workspace contracts, provision build artifacts, and launch previews that the Studio sandbox can host.
						</p>
					</div>
				</div>

				<div class="flex flex-wrap gap-3">
					<Button variant="outline" class="rounded-full px-5" href={`/app/studios/${data.studioId}/sandbox`}>
						Open sandbox
					</Button>
					<Button variant="outline" class="rounded-full px-5" onclick={() => refreshDeployments(true)} disabled={isRefreshing}>
						{isRefreshing ? 'Refreshing...' : 'Refresh'}
					</Button>
					<Button class="rounded-full px-5" onclick={createWorkspace} disabled={isCreatingWorkspace}>
						<PlusIcon class="size-4" />
						{isCreatingWorkspace ? 'Creating...' : 'Create workspace'}
					</Button>
				</div>
			</div>
		</section>

		<div class="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
				<div class="mb-5 flex items-center gap-3">
					<div class={`rounded-2xl bg-muted p-3 ${runtimeTone}`}>
						<RocketIcon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Studio runtime</p>
						<h2 class="text-lg font-semibold">Deployment host state</h2>
					</div>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<div class="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sandbox</p>
						<p class="mt-3 text-xl font-semibold">{runtime?.label ?? 'Idle'}</p>
					</div>
					<div class="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</p>
						<p class="mt-3 text-sm font-medium text-muted-foreground">{runtime?.summary ?? 'No sandbox state available yet.'}</p>
					</div>
				</div>
			</section>

			<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
				<div class="mb-5 flex items-center gap-3">
					<div class="rounded-2xl bg-emerald-500/10 p-3 text-emerald-700">
						<Layers3Icon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace model</p>
						<h2 class="text-lg font-semibold">How deployments work</h2>
					</div>
				</div>

				<div class="grid gap-4 text-sm leading-7 text-muted-foreground md:grid-cols-3">
					<p>Create a workspace contract once per deployable surface. It defines storage paths, preview commands, and the deployment runtime contract.</p>
					<p>Provision builds the workspace output and marks a deployment revision ready for activation or preview.</p>
					<p>Preview starts the deployment inside the Studio sandbox so the Sandbox page can monitor the running dev process and logs.</p>
				</div>
			</section>
		</div>

		<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
			<div class="mb-5 flex items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					<div class="rounded-2xl bg-sky-500/10 p-3 text-sky-700">
						<GlobeIcon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspaces</p>
						<h2 class="text-xl font-semibold">Deployable apps</h2>
					</div>
				</div>
				<Badge class="rounded-full bg-muted px-3 py-1 text-muted-foreground">{workspaces.length} total</Badge>
			</div>

			{#if workspaces.length > 0}
				<div class="space-y-4">
					{#each workspaces as workspace (workspace.workspace._id)}
						<div class="rounded-[1.75rem] border border-border/60 bg-background/75 p-5">
							<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-2">
										<p class="truncate text-lg font-semibold">{workspace.workspace.name}</p>
										<Badge variant="outline" class={`rounded-full text-[11px] uppercase tracking-[0.18em] ${workspaceDeploymentTone(workspace.deployment?.status)}`}>
											{workspaceDeploymentBadge(workspace.deployment?.status ?? workspace.workspace.status)}
										</Badge>
									</div>
									<p class="mt-1 text-sm text-muted-foreground">{workspace.workspace.framework} · {workspace.workspace.templateKind}</p>
								</div>
								<div class="flex flex-wrap gap-2">
									<Button
										variant="outline"
										size="sm"
										class="rounded-full"
										onclick={() => runWorkspaceAction(workspace.workspace._id, 'provision')}
										disabled={!!workspaceActionById[workspace.workspace._id]}
									>
										{workspaceActionById[workspace.workspace._id] === 'provision' ? 'Provisioning...' : 'Provision'}
									</Button>
									{#if workspaceCanPreview(workspace)}
										<Button
											variant="outline"
											size="sm"
											class="rounded-full"
											onclick={() => runWorkspaceAction(workspace.workspace._id, 'preview')}
											disabled={!!workspaceActionById[workspace.workspace._id]}
										>
											{workspaceActionById[workspace.workspace._id] === 'preview' ? 'Starting...' : 'Start preview'}
										</Button>
									{:else}
										<Button variant="outline" size="sm" class="rounded-full" href={`/app/studios/${data.studioId}/sandbox`}>
											Open sandbox
										</Button>
									{/if}
								</div>
							</div>

							<div class="mt-5 grid gap-3 text-xs leading-6 text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
								<p>Workspace: <span class="font-medium text-foreground">{workspace.workspace.status}</span></p>
								<p>Deployment: <span class="font-medium text-foreground">{workspace.deployment?.status ?? 'pending'}</span></p>
								<p>Revision: <span class="font-medium text-foreground">{workspace.deployment?.revision ?? 0}</span></p>
								<p>Host: <span class="font-mono text-[11px] text-foreground">{workspace.workspace.defaultHost ?? 'pending'}</span></p>
								<p>Public: <span class="font-mono text-[11px] text-foreground">{workspace.workspace.publicHost ?? workspace.workspace.defaultHost ?? 'pending'}</span></p>
								<p>Artifact: <span class="font-mono text-[11px] text-foreground">{workspace.deployment?.artifactPath ?? 'pending'}</span></p>
								<p>Source: <span class="font-mono text-[11px] text-foreground">{workspace.workspace.sourcePath}</span></p>
								<p>Build: <span class="font-mono text-[11px] text-foreground">{workspace.workspace.buildPath}</span></p>
								<p>State: <span class="font-mono text-[11px] text-foreground">{workspace.workspace.statePath ?? workspace.workspace.rootPath}</span></p>
								<p>Runtime: <span class="font-medium text-foreground">{workspace.workspace.runtimeKind}</span> · <span class="font-medium text-foreground">{workspace.workspace.lifecycleMode}</span></p>
								<p>Run: <span class="font-mono text-[11px] text-foreground">{workspace.workspace.runCommand || workspace.workspace.serveCommand}</span></p>
								<p>Health: <span class="font-medium text-foreground">{workspace.workspace.healthCheckPath ?? '/'}</span></p>
								<p>Preview API: <span class="font-mono text-[11px] text-foreground">{workspace.runtimeContract.api.previewPath}</span></p>
								<p>Runtime API: <span class="font-mono text-[11px] text-foreground">{workspace.runtimeContract.api.runtimePath}</span></p>
								<p>Storage root: <span class="font-mono text-[11px] text-foreground">{workspace.runtimeContract.storage.rootPath}</span></p>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="rounded-[1.5rem] border border-dashed border-border/80 bg-muted/30 px-5 py-12 text-center">
					<GlobeIcon class="mx-auto size-9 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No deployments yet</h3>
					<p class="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
						Create the first workspace contract for this Studio. Provisioning builds the deployable artifact, and preview launches it inside the sandbox.
					</p>
					<Button class="mt-5 rounded-full" onclick={createWorkspace} disabled={isCreatingWorkspace}>
						{isCreatingWorkspace ? 'Creating...' : 'Create first workspace'}
					</Button>
				</div>
			{/if}
		</section>
	</div>
</StudioPageShell>
