<script lang="ts">
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Sheet from '$lib/components/ui/sheet';

	type DebugPayload = {
		chat: {
			id: string;
			title: string;
			studioId: string;
			createdAt: number;
			updatedAt: number;
		};
		run: {
			id: string;
			status: string;
			model: string;
			attempt: number;
			streamKey: string;
			liveAttachable: boolean;
			startedAt: number;
			endedAt: number | null;
			createdAt: number;
			updatedAt: number;
			completedAt: number | null;
			error: string | null;
			runtimeEngaged: boolean;
			runtimeToolName: string | null;
			previewUrl: string | null;
		} | null;
		runs: Array<{
			id: string;
			status: string;
			model: string | null;
			streamKey: string;
			liveAttachable: boolean;
			error: string | null;
			startedAt: number;
			endedAt: number | null;
			createdAt: number;
			updatedAt: number;
			runtimeEngaged: boolean | null;
			runtimeToolName: string | null;
			previewUrl: string | null;
		}>;
		liveSession: unknown;
		persistedEvents: unknown[];
		storedMessages: unknown[];
		context: {
			model: string;
			lastUserMessage: string;
			messages: unknown[];
			memories: unknown[];
			skills: unknown[];
			memoryContext: string;
			skillContext: string;
			systemPrompt: string;
			allMessages: unknown[];
			toolNames: string[];
		};
	};

	interface Props {
		chatId: string;
		open?: boolean;
	}

	let { chatId, open = $bindable(false) }: Props = $props();

	let debugData = $state<DebugPayload | null>(null);
	let isLoading = $state(false);
	let errorMessage = $state<string | null>(null);
	let actionMessage = $state<string | null>(null);
	let activeAdminAction = $state<string | null>(null);
	let currentChatId = '';

	$effect(() => {
		if (chatId !== currentChatId) {
			currentChatId = chatId;
			debugData = null;
			errorMessage = null;
			actionMessage = null;
			isLoading = false;
			open = false;
		}
	});

	$effect(() => {
		if (open) {
			void loadDebugContext();
		}
	});

	async function loadDebugContext(force = false) {
		if (!chatId || isLoading || (!force && debugData)) return;

		isLoading = true;
		errorMessage = null;
		try {
			const res = await fetch(`/api/internal/chats/${chatId}/debug-context`);
			if (!res.ok) {
				const payload = await res.json().catch(() => ({}));
				throw new Error(payload.message || payload.error || `HTTP ${res.status}`);
			}
			debugData = await res.json();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to load debug context';
		} finally {
			isLoading = false;
		}
	}

	async function reconcileRun(action: 'reconcile' | 'abort' | 'mark_failed') {
		if (!debugData?.run || activeAdminAction) return;

		activeAdminAction = action;
		actionMessage = null;
		errorMessage = null;
		try {
			const res = await fetch(`/api/internal/chat-runs/${debugData.run.id}/reconcile`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action }),
			});
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(payload.error || payload.message || `HTTP ${res.status}`);
			}
			actionMessage = payload.summary || 'Run action completed';
			await loadDebugContext(true);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to run reconciliation action';
		} finally {
			activeAdminAction = null;
		}
	}

	function formatDate(value: number | null | undefined) {
		if (!value) return '—';
		return new Date(value).toLocaleString();
	}

	function asJson(value: unknown) {
		return JSON.stringify(value, null, 2);
	}
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="right" class="w-[min(96vw,72rem)] gap-0 sm:max-w-[72rem]">
		<Sheet.Header class="border-b">
			<div class="flex items-start justify-between gap-4">
				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<ShieldIcon class="size-4 text-muted-foreground" />
						<Sheet.Title>Agent context inspector</Sheet.Title>
					</div>
					<Sheet.Description>
						Super-admin view of the assembled chat context, including the full system prompt, tool list, memories, skills, and model messages.
					</Sheet.Description>
				</div>
				<Button variant="outline" size="sm" class="shrink-0" onclick={() => loadDebugContext(true)} disabled={isLoading}>
					<RefreshCwIcon class={isLoading ? 'animate-spin' : ''} />
					Refresh
				</Button>
			</div>
		</Sheet.Header>

		<div class="flex-1 space-y-4 overflow-y-auto p-4">
			{#if errorMessage}
				<div class="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
					{errorMessage}
				</div>
			{:else if actionMessage}
				<div class="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700">
					{actionMessage}
				</div>
			{:else if isLoading && !debugData}
				<div class="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
					Loading assembled agent context…
				</div>
			{:else if debugData}
				<div class="flex flex-wrap gap-2">
					<Badge variant="outline">{debugData.run?.status ?? 'no run yet'}</Badge>
					<Badge variant="outline">{debugData.context.model}</Badge>
					<Badge variant="outline">{debugData.context.toolNames.length} tools</Badge>
					<Badge variant="outline">{debugData.context.memories.length} memories</Badge>
					<Badge variant="outline">{debugData.context.skills.length} skills</Badge>
					<Badge variant="outline">{debugData.runs.length} runs</Badge>
					<Badge variant="outline">{debugData.persistedEvents.length} persisted events</Badge>
				</div>

				<section class="rounded-2xl border border-border/70 bg-muted/20 p-4">
					<h3 class="font-medium">Run metadata</h3>
					<div class="mt-3 grid gap-3 text-sm sm:grid-cols-2">
						<div>
							<p class="text-muted-foreground">Chat</p>
							<p>{debugData.chat.title}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Run ID</p>
							<p class="break-all">{debugData.run?.id ?? 'Not started yet'}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Updated</p>
							<p>{formatDate(debugData.run?.updatedAt ?? debugData.chat.updatedAt)}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Chat created</p>
							<p>{formatDate(debugData.chat.createdAt)}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Completed</p>
							<p>{formatDate(debugData.run?.completedAt)}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Stream key</p>
							<p class="break-all">{debugData.run?.streamKey ?? '—'}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Live attachable</p>
							<p>{debugData.run ? String(debugData.run.liveAttachable) : '—'}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Run error</p>
							<p class="break-words">{debugData.run?.error ?? '—'}</p>
						</div>
					</div>
					{#if debugData.run}
						<div class="mt-4 flex flex-wrap gap-2">
							<Button variant="outline" size="sm" disabled={!!activeAdminAction} onclick={() => reconcileRun('reconcile')}>
								{activeAdminAction === 'reconcile' ? 'Reconciling…' : 'Reconcile run'}
							</Button>
							<Button variant="outline" size="sm" disabled={!!activeAdminAction} onclick={() => reconcileRun('abort')}>
								{activeAdminAction === 'abort' ? 'Aborting…' : 'Force abort'}
							</Button>
							<Button variant="destructive" size="sm" disabled={!!activeAdminAction} onclick={() => reconcileRun('mark_failed')}>
								{activeAdminAction === 'mark_failed' ? 'Marking failed…' : 'Mark stale failed'}
							</Button>
						</div>
					{/if}
				</section>

				<section class="space-y-2 rounded-2xl border border-border/70 p-4">
					<h3 class="font-medium">Live run session snapshot</h3>
					<pre class="max-h-[20rem] overflow-auto rounded-xl bg-muted/40 p-3 text-xs">{asJson(debugData.liveSession)}</pre>
				</section>

				<section class="space-y-2 rounded-2xl border border-border/70 p-4">
					<h3 class="font-medium">Recent run records</h3>
					<pre class="max-h-[24rem] overflow-auto rounded-xl bg-muted/40 p-3 text-xs">{asJson(debugData.runs)}</pre>
				</section>

				<section class="space-y-2 rounded-2xl border border-border/70 p-4">
					<h3 class="font-medium">Last user message</h3>
					<pre class="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-muted/40 p-3 text-xs">{debugData.context.lastUserMessage || '—'}</pre>
				</section>

				<section class="space-y-2 rounded-2xl border border-border/70 p-4">
					<h3 class="font-medium">System prompt</h3>
					<pre class="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted/40 p-3 text-xs">{debugData.context.systemPrompt}</pre>
				</section>

				<section class="space-y-2 rounded-2xl border border-border/70 p-4">
					<h3 class="font-medium">Tool names</h3>
					<pre class="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-muted/40 p-3 text-xs">{debugData.context.toolNames.join('\n')}</pre>
				</section>

				<section class="space-y-2 rounded-2xl border border-border/70 p-4">
					<h3 class="font-medium">Memory context</h3>
					<pre class="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted/40 p-3 text-xs">{debugData.context.memoryContext || '—'}</pre>
				</section>

				<section class="space-y-2 rounded-2xl border border-border/70 p-4">
					<h3 class="font-medium">Skill context</h3>
					<pre class="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted/40 p-3 text-xs">{debugData.context.skillContext || '—'}</pre>
				</section>

				<section class="space-y-2 rounded-2xl border border-border/70 p-4">
					<h3 class="font-medium">Model message payload</h3>
					<pre class="max-h-[28rem] overflow-auto rounded-xl bg-muted/40 p-3 text-xs">{asJson(debugData.context.allMessages)}</pre>
				</section>

				<section class="space-y-2 rounded-2xl border border-border/70 p-4">
					<h3 class="font-medium">Stored chat messages</h3>
					<pre class="max-h-[28rem] overflow-auto rounded-xl bg-muted/40 p-3 text-xs">{asJson(debugData.storedMessages)}</pre>
				</section>

				<section class="space-y-2 rounded-2xl border border-border/70 p-4">
					<h3 class="font-medium">Persisted non-text events</h3>
					<pre class="max-h-[28rem] overflow-auto rounded-xl bg-muted/40 p-3 text-xs">{asJson(debugData.persistedEvents)}</pre>
				</section>

				<section class="space-y-2 rounded-2xl border border-border/70 p-4">
					<h3 class="font-medium">Resolved memories</h3>
					<pre class="max-h-[28rem] overflow-auto rounded-xl bg-muted/40 p-3 text-xs">{asJson(debugData.context.memories)}</pre>
				</section>

				<section class="space-y-2 rounded-2xl border border-border/70 p-4">
					<h3 class="font-medium">Enabled skills</h3>
					<pre class="max-h-[28rem] overflow-auto rounded-xl bg-muted/40 p-3 text-xs">{asJson(debugData.context.skills)}</pre>
				</section>
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>
