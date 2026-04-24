<script lang="ts">
	import ChatTimelineRow from "$lib/components/nova/chat/chat-timeline-row.svelte";

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

	let { entries }: { entries: TimelineItem[] } = $props();
	const keyedEntries = $derived.by(() => {
		const counts = new Map<string, number>();
		return entries.map((entry) => {
			const seen = counts.get(entry.id) ?? 0;
			counts.set(entry.id, seen + 1);
			return {
				entry,
				key: seen === 0 ? entry.id : `${entry.id}:${seen}`,
			};
		});
	});
</script>

<div class="space-y-2.5">
	{#each keyedEntries as item (item.key)}
		<ChatTimelineRow entry={item.entry} />
	{/each}
</div>
