<script lang="ts">
	import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
	import FileTextIcon from "@lucide/svelte/icons/file-text";
	import GlobeIcon from "@lucide/svelte/icons/globe";
	import PackageIcon from "@lucide/svelte/icons/package";
	import RocketIcon from "@lucide/svelte/icons/rocket";
	import { cn } from "$lib/utils";

	type ArtifactCardData = {
		id?: string;
		kind: "file" | "preview" | "generated" | "deploy-output";
		title: string;
		status: "ready" | "deleted" | "stopped" | "failed";
		url?: string | null;
		path?: string | null;
		contentType?: string | null;
		size?: number | null;
		source?: string | null;
		updatedAt?: number | null;
		metadata?: Record<string, unknown> | null;
	};

	let {
		artifact,
		compact = false,
	}: {
		artifact: ArtifactCardData;
		compact?: boolean;
	} = $props();

	const iconClass = $derived(compact ? "size-4" : "size-5");
	const statusTone = $derived.by(() => {
		switch (artifact.status) {
			case "ready":
				return "bg-emerald-500/10 text-emerald-700";
			case "failed":
				return "bg-destructive/10 text-destructive";
			case "deleted":
			case "stopped":
				return "bg-muted text-muted-foreground";
			default:
				return "bg-muted text-muted-foreground";
		}
	});

	const statusLabel = $derived.by(() => {
		switch (artifact.status) {
			case "ready":
				return "Ready";
			case "deleted":
				return "Deleted";
			case "stopped":
				return "Stopped";
			case "failed":
				return "Failed";
			default:
				return artifact.status;
		}
	});

	const kindLabel = $derived.by(() => {
		switch (artifact.kind) {
			case "preview":
				return "Preview";
			case "file":
				return "File";
			case "generated":
				return "Generated output";
			case "deploy-output":
				return "Deployment";
			default:
				return "Artifact";
		}
	});

	const primaryDetail = $derived(
		typeof artifact.path === "string" && artifact.path.trim()
			? artifact.path
			: typeof artifact.url === "string" && artifact.url.trim()
				? artifact.url
				: null,
	);

	const secondaryDetail = $derived.by(() => {
		const details: string[] = [];
		if (typeof artifact.size === "number" && Number.isFinite(artifact.size)) {
			details.push(new Intl.NumberFormat().format(artifact.size) + " bytes");
		}
		if (typeof artifact.contentType === "string" && artifact.contentType.trim()) {
			details.push(artifact.contentType);
		}
		if (typeof artifact.source === "string" && artifact.source.trim()) {
			details.push(artifact.source);
		}
		if (typeof artifact.updatedAt === "number" && Number.isFinite(artifact.updatedAt)) {
			details.push(`Updated ${new Date(artifact.updatedAt).toLocaleString()}`);
		}
		return details.join(" • ");
	});

	const Icon = $derived.by(() => {
		switch (artifact.kind) {
			case "preview":
				return GlobeIcon;
			case "deploy-output":
				return RocketIcon;
			case "generated":
				return PackageIcon;
			case "file":
			default:
				return FileTextIcon;
		}
	});
</script>

<div
	class={cn(
		"rounded-[1.5rem] border border-border/60 bg-background/75",
		compact ? "p-3" : "p-4",
	)}
>
	<div class="flex items-start justify-between gap-4">
		<div class="flex min-w-0 items-start gap-3">
			<div class={cn("rounded-2xl p-2.5", statusTone)}>
				<Icon class={iconClass} />
			</div>
			<div class="min-w-0">
				<p class="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{kindLabel}</p>
				<h3 class={cn("mt-1 font-semibold tracking-tight", compact ? "text-sm" : "text-base")}>
					{artifact.title}
				</h3>
				{#if primaryDetail}
					<p class="mt-2 break-all text-xs text-muted-foreground">{primaryDetail}</p>
				{/if}
				{#if secondaryDetail}
					<p class="mt-2 text-xs text-muted-foreground">{secondaryDetail}</p>
				{/if}
			</div>
		</div>

		<div class="flex shrink-0 items-center gap-2">
			<span class="rounded-full border border-border/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
				{statusLabel}
			</span>
			{#if artifact.url}
				<a
					class="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
					href={artifact.url}
					target="_blank"
					rel="noreferrer"
				>
					Open
					<ExternalLinkIcon class="size-3.5" />
				</a>
			{/if}
		</div>
	</div>
</div>
