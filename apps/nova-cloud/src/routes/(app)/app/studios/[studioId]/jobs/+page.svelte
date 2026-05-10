<script lang="ts">
	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import Clock3Icon from '@lucide/svelte/icons/clock-3';
	import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
	import PlayIcon from '@lucide/svelte/icons/play';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import * as Item from '$lib/components/ui/item';
	import { Switch } from '$lib/components/ui/switch';
	import { Textarea } from '$lib/components/ui/textarea';
	import StudioPageShell from '$lib/components/studios/studio-page-shell.svelte';
	import {
		normalizeIntervalMinutes,
		normalizeTimeOfDay,
		normalizeWeekday,
		summarizeSchedule,
		type JobScheduleFrequency,
	} from '$lib/jobs/schedule';
	import { toast } from 'svelte-sonner';

	type ScheduledJob = {
		_id: string;
		title: string;
		prompt: string;
		frequency: JobScheduleFrequency;
		intervalMinutes?: number | null;
		timeOfDay?: string | null;
		weekday?: number | null;
		summary: string;
		status: 'enabled' | 'paused';
		nextRunAt?: number | null;
		lastRunAt?: number | null;
		lastRunId?: string | null;
		lastError?: string | null;
		createdAt: number;
		updatedAt: number;
	};

	type JobForm = {
		title: string;
		prompt: string;
		frequency: JobScheduleFrequency;
		intervalMinutes: number;
		timeOfDay: string;
		weekday: number;
		enabled: boolean;
	};

	let { data }: { data: any } = $props();

	let editorOpen = $state(false);
	let editingJob = $state<ScheduledJob | null>(null);
	let isSaving = $state(false);
	let isRunningJobId = $state<string | null>(null);
	let isDeletingJobId = $state<string | null>(null);
	let isRefreshingJobsState = $state(false);
	let form = $state<JobForm>(defaultForm());
	let jobs = $state.raw(data.jobs ?? []);
	let chats = $state.raw(data.chats ?? []);
	let scheduledRunsState = $state.raw(data.runs ?? []);

	const scheduledRuns = $derived(scheduledRunsState ?? []);
	const chatTitleById = $derived(new Map((chats ?? []).map((chat: any) => [chat.id, chat.title])));
	const scheduleSummary = $derived(summarizeSchedule(form));

	function defaultForm(): JobForm {
		return {
			title: '',
			prompt: '',
			frequency: 'daily',
			intervalMinutes: 60,
			timeOfDay: '09:00',
			weekday: 1,
			enabled: true,
		};
	}

	function openCreateDialog() {
		editingJob = null;
		form = defaultForm();
		editorOpen = true;
	}

	function openEditDialog(job: ScheduledJob) {
		editingJob = job;
		form = {
			title: job.title,
			prompt: job.prompt,
			frequency: job.frequency,
			intervalMinutes: normalizeIntervalMinutes(job.intervalMinutes),
			timeOfDay: normalizeTimeOfDay(job.timeOfDay),
			weekday: normalizeWeekday(job.weekday),
			enabled: job.status === 'enabled',
		};
		editorOpen = true;
	}

	function schedulePayload() {
		return {
			...form,
			title: form.title.trim() || 'Untitled job',
			prompt: form.prompt.trim(),
			intervalMinutes: normalizeIntervalMinutes(form.intervalMinutes),
			timeOfDay: normalizeTimeOfDay(form.timeOfDay),
			weekday: normalizeWeekday(form.weekday),
		};
	}

	async function refreshJobsState(showToast = false) {
		if (isRefreshingJobsState) return;
		isRefreshingJobsState = true;
		try {
			const res = await fetch(`/api/studios/${data.studio._id}/jobs-state`);
			if (!res.ok) {
				if (showToast) toast.error('Failed to refresh jobs');
				return;
			}
			const payload = await res.json();
			jobs = payload.jobs ?? jobs;
			chats = payload.chats ?? chats;
			scheduledRunsState = payload.runs ?? scheduledRunsState;
			if (showToast) toast.success('Jobs refreshed');
		} finally {
			isRefreshingJobsState = false;
		}
	}

	async function saveJob() {
		const payload = schedulePayload();
		if (!payload.prompt || isSaving) return;
		isSaving = true;
		try {
			const url = editingJob
				? `/api/studios/${data.studio._id}/scheduled-jobs/${editingJob._id}`
				: `/api/studios/${data.studio._id}/scheduled-jobs`;
			const res = await fetch(url, {
				method: editingJob ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				toast.error(body.error || 'Failed to save job');
				return;
			}
			toast.success(editingJob ? 'Job updated' : 'Job created');
			editorOpen = false;
			await refreshJobsState(false);
		} finally {
			isSaving = false;
		}
	}

	async function runJob(job: ScheduledJob) {
		if (isRunningJobId) return;
		isRunningJobId = job._id;
		try {
			const res = await fetch(`/api/studios/${data.studio._id}/scheduled-jobs/${job._id}/run`, {
				method: 'POST',
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				toast.error(body.error || 'Failed to run job');
				return;
			}
			toast.success('Job run started');
			await refreshJobsState(false);
		} finally {
			isRunningJobId = null;
		}
	}

	async function deleteJob(job: ScheduledJob) {
		if (isDeletingJobId) return;
		isDeletingJobId = job._id;
		try {
			const res = await fetch(`/api/studios/${data.studio._id}/scheduled-jobs/${job._id}`, {
				method: 'DELETE',
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				toast.error(body.error || 'Failed to delete job');
				return;
			}
			toast.success('Job deleted');
			await refreshJobsState(false);
		} finally {
			isDeletingJobId = null;
		}
	}

	function formatDate(value?: number | null) {
		if (!value) return 'Not yet';
		return new Date(value).toLocaleString();
	}

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

	onMount(() => {
		const studioId = data.studio?._id;
		if (!studioId) return;

		const source = new EventSource(`/api/studios/${studioId}/events/stream`);
		const refresh = () => {
			void refreshJobsState(false);
		};

		for (const eventName of ['job.updated', 'job.run-started', 'job.run-failed']) {
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

<StudioPageShell
	class="bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.12),transparent_28%)]"
	containerClass="max-w-6xl"
>
	<div class="flex flex-col gap-6">
		<section class="rounded-[2.25rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur sm:p-8">
			<div class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
				<div class="space-y-3">
					<Badge variant="outline" class="w-fit rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em]">
						Studio jobs
					</Badge>
					<div>
						<h1 class="text-3xl font-semibold tracking-tight sm:text-5xl">Scheduled agent work</h1>
						<p class="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
							Create recurring tasks in plain text. Nova will send the saved prompt to the agent whenever the job is invoked, and each run is recorded in execution history.
						</p>
					</div>
				</div>
				<Button class="rounded-full px-5" onclick={openCreateDialog}>
					<PlusIcon class="size-4" />
					New job
				</Button>
			</div>
		</section>

		<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
			<div class="mb-5 flex items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					<div class="rounded-2xl bg-sky-500/10 p-3 text-sky-700">
						<CalendarClockIcon class="size-5" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Cron jobs</p>
						<h2 class="text-xl font-semibold">Saved jobs</h2>
					</div>
				</div>
				<Badge class="rounded-full bg-muted px-3 py-1 text-muted-foreground">{jobs.length} total</Badge>
			</div>

			{#if jobs.length > 0}
				<Item.Group class="gap-3">
					{#each jobs as job (job._id)}
						<Item.Root variant="outline" class="rounded-[1.5rem] bg-background/75">
							<Item.Media variant="icon" class={job.status === 'enabled' ? 'text-sky-700' : 'text-muted-foreground'}>
								<Clock3Icon />
							</Item.Media>
							<Item.Content class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<Item.Title class="truncate">{job.title}</Item.Title>
									<Badge variant={job.status === 'enabled' ? 'default' : 'outline'} class="rounded-full text-[10px] uppercase tracking-[0.16em]">
										{job.status === 'enabled' ? 'Active' : 'Paused'}
									</Badge>
								</div>
								<Item.Description class="mt-1">
									{job.summary} • Next run: {formatDate(job.nextRunAt)}
								</Item.Description>
								<p class="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{job.prompt}</p>
								{#if job.lastError}
									<p class="mt-2 text-sm text-destructive">Last error: {job.lastError}</p>
								{/if}
							</Item.Content>
							<Item.Actions class="flex-wrap">
								<Button size="sm" variant="outline" class="rounded-full" disabled={isRunningJobId === job._id} onclick={() => runJob(job)}>
									<PlayIcon class="size-3.5" />
									{isRunningJobId === job._id ? 'Starting...' : 'Run now'}
								</Button>
								<Button size="sm" variant="ghost" class="rounded-full" onclick={() => openEditDialog(job)}>
									<MoreHorizontalIcon class="size-3.5" />
									Edit
								</Button>
								<Button size="icon" variant="ghost" class="rounded-full text-destructive" disabled={isDeletingJobId === job._id} aria-label={`Delete ${job.title}`} onclick={() => deleteJob(job)}>
									<Trash2Icon class="size-4" />
								</Button>
							</Item.Actions>
						</Item.Root>
					{/each}
				</Item.Group>
			{:else}
				<div class="rounded-[1.5rem] border border-dashed border-border/80 bg-muted/30 px-5 py-12 text-center">
					<CalendarClockIcon class="mx-auto size-9 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No jobs yet</h3>
					<p class="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
						Create a recurring job like “Every day at 9:00 AM, read Reddit AI news and save a summary for my YouTube planning.”
					</p>
					<Button class="mt-5 rounded-full" onclick={openCreateDialog}>Create first job</Button>
				</div>
			{/if}
		</section>

		<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
			<div class="mb-5">
				<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">History</p>
				<h2 class="text-xl font-semibold">Recent scheduled runs</h2>
			</div>
			{#if scheduledRuns.length > 0}
				<div class="space-y-3">
					{#each scheduledRuns as run (run._id)}
						<a href={`/app/studios/${data.studio._id}/chat/${run.chatId}`} class="flex items-center justify-between gap-4 rounded-[1.25rem] border border-border/60 bg-background/75 px-4 py-4 transition-colors hover:bg-muted/40">
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<span class={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${runStatusTone(run.status)}`}>
										{run.status}
									</span>
									<span class="text-xs text-muted-foreground">{formatDate(run.startedAt)}</span>
								</div>
								<p class="mt-2 truncate font-medium">{chatTitleById.get(run.chatId) ?? 'Scheduled job run'}</p>
							</div>
							<span class="shrink-0 text-sm font-medium text-muted-foreground">Open chat</span>
						</a>
					{/each}
				</div>
			{:else}
				<p class="text-sm leading-7 text-muted-foreground">Scheduled job runs will appear here once a job is invoked.</p>
			{/if}
		</section>
	</div>
</StudioPageShell>

<Dialog.Root bind:open={editorOpen}>
	<Dialog.Content class="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>{editingJob ? 'Edit job' : 'Create job'}</Dialog.Title>
			<Dialog.Description>
				Choose when the job should run, then write the exact prompt Nova should send to the agent each time.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-5 py-4">
			<div class="grid gap-2">
				<label class="text-sm font-medium" for="job-title">Job name</label>
				<Input id="job-title" bind:value={form.title} placeholder="Daily AI news brief" />
			</div>

			<div class="rounded-[1.5rem] border border-border/70 bg-muted/30 p-4">
				<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Schedule summary</p>
				<p class="mt-2 text-lg font-semibold">{scheduleSummary}</p>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="grid gap-2">
					<label class="text-sm font-medium" for="job-frequency">Repeats</label>
					<select
						id="job-frequency"
						class="border-input bg-background ring-offset-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
						bind:value={form.frequency}
					>
						<option value="every_minutes">Every few minutes</option>
						<option value="hourly">Every hour</option>
						<option value="daily">Every day</option>
						<option value="weekly">Every week</option>
					</select>
				</div>

				{#if form.frequency === 'every_minutes'}
					<div class="grid gap-2">
						<label class="text-sm font-medium" for="job-interval">Every</label>
						<Input id="job-interval" type="number" min="5" max="1440" step="5" bind:value={form.intervalMinutes} />
						<p class="text-xs text-muted-foreground">Minutes, between 5 and 1440.</p>
					</div>
				{:else if form.frequency === 'daily' || form.frequency === 'weekly'}
					<div class="grid gap-2">
						<label class="text-sm font-medium" for="job-time">Time</label>
						<Input id="job-time" type="time" bind:value={form.timeOfDay} />
					</div>
				{/if}
			</div>

			{#if form.frequency === 'weekly'}
				<div class="grid gap-2">
					<label class="text-sm font-medium" for="job-weekday">Day</label>
					<select
						id="job-weekday"
						class="border-input bg-background ring-offset-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
						bind:value={form.weekday}
					>
						<option value={0}>Sunday</option>
						<option value={1}>Monday</option>
						<option value={2}>Tuesday</option>
						<option value={3}>Wednesday</option>
						<option value={4}>Thursday</option>
						<option value={5}>Friday</option>
						<option value={6}>Saturday</option>
					</select>
				</div>
			{/if}

			<div class="flex items-center justify-between gap-4 rounded-2xl border border-border/70 p-4">
				<div>
					<p class="text-sm font-medium">Enabled</p>
					<p class="text-xs leading-6 text-muted-foreground">Paused jobs stay saved but do not receive automatic invocations.</p>
				</div>
				<Switch bind:checked={form.enabled} aria-label="Enable scheduled job" />
			</div>

			<div class="grid gap-2">
				<label class="text-sm font-medium" for="job-prompt">Agent prompt</label>
				<Textarea
					id="job-prompt"
					class="min-h-40 resize-y"
					bind:value={form.prompt}
					placeholder="Read Reddit AI news and save a summary for planning my YouTube video."
				/>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (editorOpen = false)}>Cancel</Button>
			<Button disabled={!form.prompt.trim() || isSaving} onclick={saveJob}>
				{isSaving ? 'Saving...' : editingJob ? 'Save changes' : 'Create job'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
