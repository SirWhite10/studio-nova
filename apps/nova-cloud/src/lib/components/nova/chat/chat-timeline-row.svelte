<script lang="ts">
	import { AlertCircle, Check, ChevronsUpDown, Globe, Lightbulb, Package, Wrench } from "@lucide/svelte";
	import ArtifactCard from "$lib/components/studios/artifact-card.svelte";
	import TextShimmerLoader from "$lib/components/prompt-kit/loader/text-shimmer-loader.svelte";
	import { DotsLoader } from "$lib/components/prompt-kit/loader";
	import * as Collapsible from "$lib/components/ui/collapsible/index.js";
	import * as Item from "$lib/components/ui/item/index.js";
	import { cn } from "$lib/utils";

	type TimelineItem = {
		id: string;
		kind: "thinking" | "tool" | "runtime" | "artifact" | "error";
		label: string;
		detail?: string;
		state: "streaming" | "success" | "error" | "complete";
		input?: unknown;
		output?: unknown;
		errorText?: string;
	};

	let { entry }: { entry: TimelineItem } = $props();

	function renderOutput(output: unknown) {
		if (typeof output === "string") {
			const trimmed = output.trim();
			if (!trimmed) {
				return { kind: "json", value: output } as const;
			}

			const treeLike = trimmed.includes("\n") && /(^|\n)([│├└─]|\.|\/.+)/.test(trimmed);
			if (treeLike) {
				return { kind: "tree", value: trimmed } as const;
			}

			const lines = trimmed.split("\n").filter(Boolean);
			const searchLike = lines.every((line) => /.+:\d+/.test(line));
			if (lines.length > 1 && searchLike) {
				return { kind: "matches", value: lines } as const;
			}

			if (lines.length > 1) {
				return { kind: "shell", value: trimmed } as const;
			}
		}

		if (Array.isArray(output) && output.every((item) => typeof item === "string")) {
			return { kind: "list", value: output as string[] } as const;
		}

		if (Array.isArray(output) && output.every((item) => item && typeof item === "object")) {
			const fileLike = (output as Array<Record<string, unknown>>).every(
				(item) => typeof item.path === "string" || typeof item.name === "string" || typeof item.file === "string",
			);
			if (fileLike) {
				return {
					kind: "list",
					value: (output as Array<Record<string, unknown>>).map(
						(item) => String(item.path || item.name || item.file),
					),
				} as const;
			}
		}

		if (output && typeof output === "object") {
			const maybeFiles = (output as Record<string, unknown>).files;
			if (Array.isArray(maybeFiles) && maybeFiles.every((item) => typeof item === "string")) {
				return { kind: "list", value: maybeFiles as string[] } as const;
			}
		}

		if (output && typeof output === "object") {
			const record = output as Record<string, unknown>;
			const stdout = typeof record.stdout === "string" ? record.stdout.trim() : "";
			const stderr = typeof record.stderr === "string" ? record.stderr.trim() : "";
			if (stdout || stderr) {
				return {
					kind: "shell",
					value: [stdout, stderr].filter(Boolean).join("\n"),
				} as const;
			}

			const matches = record.matches;
			if (Array.isArray(matches) && matches.every((item) => typeof item === "string")) {
				return { kind: "matches", value: matches as string[] } as const;
			}
		}

		return {
			kind: "json",
			value: typeof output === "string" ? output : JSON.stringify(output, null, 2),
		} as const;
	}

	const outputView = $derived(entry.output !== undefined ? renderOutput(entry.output) : null);
	const hasDetails = $derived(entry.input !== undefined || outputView !== null || Boolean(entry.errorText));
	const title = $derived(entry.kind === "thinking" ? "Thinking" : entry.label);
	const description = $derived(entry.detail?.trim() || undefined);
	const artifact = $derived.by(() => {
		if (entry.kind !== "artifact" || !entry.output || typeof entry.output !== "object") return null;
		const candidate = (entry.output as Record<string, unknown>).artifact;
		if (!candidate || typeof candidate !== "object") return null;
		const record = candidate as Record<string, unknown>;
		if (
			(record.kind !== "file" &&
				record.kind !== "preview" &&
				record.kind !== "generated" &&
				record.kind !== "deploy-output") ||
			typeof record.title !== "string" ||
			(record.status !== "ready" &&
				record.status !== "deleted" &&
				record.status !== "stopped" &&
				record.status !== "failed")
		) {
			return null;
		}
		return {
			kind: record.kind,
			title: record.title,
			status: record.status,
			url: typeof record.url === "string" ? record.url : null,
			path: typeof record.path === "string" ? record.path : null,
			contentType: typeof record.contentType === "string" ? record.contentType : null,
			size: typeof record.size === "number" ? record.size : null,
			source: typeof record.source === "string" ? record.source : null,
			updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : null,
			metadata: record.metadata && typeof record.metadata === "object" ? (record.metadata as Record<string, unknown>) : null,
		};
	});
</script>

{#if artifact}
	<ArtifactCard artifact={artifact} compact={true} />
{:else}

{#snippet row(trigger = false)}
	<Item.Root
		size="sm"
		variant="outline"
		class={cn(
			"w-full rounded-2xl border-border/60 bg-background/70 px-1.5 transition-all duration-200",
			entry.state === "streaming" && "border-chart-4/50 bg-chart-4/5",
			entry.state === "success" && "border-chart-1/40 bg-chart-1/5",
			entry.state === "error" && "border-destructive/40 bg-destructive/5",
		)}
	>
		<Item.Media>
			{#if entry.kind === "thinking"}
				<Lightbulb class="size-4 text-chart-4" />
			{:else if entry.kind === "tool"}
				<Wrench class="size-4" />
			{:else if entry.kind === "runtime"}
				<Globe class="size-4 text-primary" />
			{:else if entry.kind === "artifact"}
				<Package class="size-4 text-emerald-700" />
			{:else}
				<AlertCircle class="size-4 text-destructive" />
			{/if}
		</Item.Media>
		<Item.Content>
			<Item.Title class="text-xs">
				{#if entry.kind === "thinking" && entry.state === "streaming"}
					<TextShimmerLoader text="Thinking" size="sm" />
				{:else}
					{title}
				{/if}
			</Item.Title>
			{#if description}
				<Item.Description class="truncate text-[11px] text-muted-foreground">{description}</Item.Description>
			{/if}
		</Item.Content>
		<Item.Actions class="flex items-center gap-2">
			{#if entry.state === "success" || entry.state === "complete"}
				<Check class={cn("size-4", entry.state === "success" && "text-chart-1")} />
			{:else if entry.state === "error"}
				<AlertCircle class="size-4 text-destructive" />
			{:else}
				<DotsLoader />
			{/if}
			{#if trigger}
				<ChevronsUpDown class="size-3.5 text-muted-foreground" />
			{/if}
		</Item.Actions>
	</Item.Root>
{/snippet}

{#if hasDetails}
	<Collapsible.Root>
		<Collapsible.Trigger>
			{@render row(true)}
		</Collapsible.Trigger>

		<Collapsible.Content class="mt-2 space-y-2 pl-10">
			{#if entry.input !== undefined}
				<div class="space-y-1">
					<h4 class="text-xs font-medium text-muted-foreground">Input</h4>
					<pre class="bg-muted/50 overflow-x-auto whitespace-pre-wrap rounded-xl p-3 text-xs"><code>{JSON.stringify(entry.input, null, 2)}</code></pre>
				</div>
			{/if}

			{#if outputView}
				<div class="space-y-1">
					<h4 class="text-xs font-medium text-muted-foreground">Output</h4>
					{#if outputView.kind === "list" || outputView.kind === "matches"}
						<ul class="bg-muted/40 space-y-1 rounded-xl p-3 text-xs">
							{#each outputView.value as line (line)}
								<li class="font-mono text-foreground/90">{line}</li>
							{/each}
						</ul>
					{:else if outputView.kind === "tree"}
						<pre class="bg-muted/50 overflow-x-auto whitespace-pre rounded-xl p-3 text-xs"><code>{outputView.value}</code></pre>
					{:else}
						<pre class="bg-muted/50 overflow-x-auto whitespace-pre-wrap rounded-xl p-3 text-xs"><code>{outputView.value}</code></pre>
					{/if}
				</div>
			{/if}

			{#if entry.errorText}
				<div class="space-y-1">
					<h4 class="text-xs font-medium text-destructive">Error</h4>
					<pre class="overflow-x-auto whitespace-pre-wrap rounded-xl bg-destructive/10 p-3 text-xs"><code>{entry.errorText}</code></pre>
				</div>
			{/if}
		</Collapsible.Content>
	</Collapsible.Root>
{:else}
	{@render row(false)}
{/if}
{/if}
