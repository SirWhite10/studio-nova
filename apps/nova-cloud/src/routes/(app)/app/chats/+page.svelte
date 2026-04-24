<script lang="ts">
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import MessageSquareIcon from '@lucide/svelte/icons/message-square';
	import { goto } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';

	type ChatListItem = { id: string; title: string; description: string; url: string };
	type PageData = { currentStudioId: string | null; chats: ChatListItem[] };

	let { data }: { data: PageData } = $props();

	let chats = $state.raw<ChatListItem[]>(data.chats);

	$effect(() => {
		chats = data.chats;
	});

	async function handleDelete(id: string) {
		try {
			const res = await fetch(`/api/chats/${id}`, { method: 'DELETE' });
			if (!res.ok) {
				toast.error('Failed to delete chat');
				return;
			}
			chats = chats.filter((chat) => chat.id !== id);
			toast.success('Chat deleted');
		} catch {
			toast.error('Failed to delete chat');
		}
	}
</script>

<div class="min-h-[calc(100vh-4rem)] px-6 py-8 sm:px-10">
	<div class="mx-auto flex max-w-6xl flex-col gap-6">
		<div class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
			<div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
				<div class="space-y-2">
					<Badge class="rounded-full bg-muted px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Conversations</Badge>
					<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">All Studio conversations</h1>
					<p class="max-w-2xl text-sm leading-7 text-muted-foreground">
						This view now points back into Studio-scoped chat routes. Every conversation belongs to a Studio,
						and opening one takes you back into that Studio's shell.
					</p>
				</div>
				{#if data.currentStudioId}
					<Button class="rounded-full px-5" onclick={() => goto(`/app/studios/${data.currentStudioId}`)}>
						Back to current Studio
					</Button>
				{/if}
			</div>
		</div>

		{#if chats.length === 0}
			<div class="rounded-[2rem] border border-dashed border-border/80 bg-muted/40 px-5 py-14 text-center text-sm text-muted-foreground">
				No conversations yet. Start from a Studio overview to create the first Studio-scoped chat.
			</div>
		{:else}
			<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each chats as chat (chat.id)}
					<div class="rounded-[1.75rem] border border-border/70 bg-background/85 p-5 shadow-sm transition-colors hover:bg-muted/30">
						<div class="flex items-start justify-between gap-3">
							<div class="rounded-2xl bg-muted p-3 text-muted-foreground">
								<MessageSquareIcon class="size-5" />
							</div>
							<Button variant="ghost" size="sm" class="rounded-full text-muted-foreground" onclick={() => handleDelete(chat.id)}>
								Delete
							</Button>
						</div>

						<div class="mt-5 space-y-2">
							<h2 class="text-lg font-semibold">{chat.title}</h2>
							<p class="text-sm leading-6 text-muted-foreground">{chat.description}</p>
						</div>

						<button type="button" class="mt-6 flex w-full items-center justify-between rounded-2xl border border-border/60 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50" onclick={() => goto(chat.url)}>
							<span>Open in Studio</span>
							<ArrowRightIcon class="size-4" />
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
