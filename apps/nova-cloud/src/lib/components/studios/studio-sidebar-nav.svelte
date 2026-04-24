<script lang="ts">
	import MessageSquareIcon from "@lucide/svelte/icons/message-square";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import CalendarClockIcon from "@lucide/svelte/icons/calendar-clock";
	import BeakerIcon from "@lucide/svelte/icons/beaker";
	import Settings2Icon from "@lucide/svelte/icons/settings-2";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import WaypointsIcon from "@lucide/svelte/icons/waypoints";
	import WrenchIcon from "@lucide/svelte/icons/wrench";
	import FolderIcon from "@lucide/svelte/icons/folder";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { useSidebar } from "$lib/components/ui/sidebar/index.js";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { chatStore } from "$lib/nova/chat";
	import StudioIcon from "$lib/components/studios/studio-icon.svelte";
	import type { StudioIntegration, StudioSummary } from "$lib/studios/types";

	interface Props {
		studio?: StudioSummary | null;
		integrations?: StudioIntegration[];
	}

	let { studio = null, integrations = [] }: Props = $props();

	const sidebar = useSidebar();
	let loadedSidebarChats = $state(false);

	const recentChats = $derived.by(() => {
		if (!studio) return [];
		const liveChats = chatStore.chats
			.filter((chat) => chat.studioId === studio.id)
			.slice(0, 3)
			.map((chat) => ({
				id: chat.id,
				title: chat.title,
				url: chat.url
			}));
		if (liveChats.length > 0) return liveChats;
		return studio.chatPreview ?? [];
	});
	const enabledIntegrations = $derived(integrations.filter((integration) => integration.enabled));
	let isCreatingChat = $state(false);

	const mainLinks = $derived(
		studio
			? [
				{ title: "Overview", url: studio.url, icon: WaypointsIcon },
				{ title: "Skills", url: `${studio.url}/skills`, icon: SparklesIcon },
				{ title: "Files", url: `${studio.url}/files`, icon: FolderIcon },
				{ title: "Runtime", url: `${studio.url}/runtime`, icon: WrenchIcon },
				{ title: "Runtime Lab", url: `${studio.url}/runtime-lab`, icon: BeakerIcon },
				{ title: "Jobs", url: `${studio.url}/jobs`, icon: CalendarClockIcon },
				{ title: "Settings", url: `${studio.url}/settings`, icon: Settings2Icon },
			]
			: [],
	);

	async function navigate(url: string) {
		if (sidebar.isMobile) sidebar.setOpenMobile(false);
		await goto(url);
	}

	async function createChat() {
		if (!studio || isCreatingChat) return;
		isCreatingChat = true;
		try {
			if (sidebar.isMobile) sidebar.setOpenMobile(false);
			await chatStore.createChatForStudio(studio.id);
		} finally {
			isCreatingChat = false;
		}
	}

	function isActive(url: string) {
		return page.url.pathname === url || page.url.pathname.startsWith(`${url}/`);
	}

	$effect(() => {
		if (!studio?.id || loadedSidebarChats) return;
		loadedSidebarChats = true;
		void chatStore.loadChats({ silent: true });
	});
</script>

<Sidebar.Group>
	<Sidebar.GroupLabel>{studio ? "Studio" : "Welcome"}</Sidebar.GroupLabel>
	<Sidebar.GroupContent>
		<Sidebar.Menu>
			{#if studio}
				{#each mainLinks as item (item.title)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton isActive={isActive(item.url)}>
							{#snippet child({ props })}
								<a href={item.url} onclick={() => sidebar.isMobile && sidebar.setOpenMobile(false)} {...props}>
									<item.icon />
									<span>{item.title}</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/each}
			{:else}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton isActive={page.url.pathname === '/app'}>
						{#snippet child({ props })}
							<a href="/app" {...props}>
								<WaypointsIcon />
								<span>Get Started</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/if}
		</Sidebar.Menu>
	</Sidebar.GroupContent>
</Sidebar.Group>

<Sidebar.Group>
	<Sidebar.GroupLabel>Chats</Sidebar.GroupLabel>
	<Sidebar.GroupContent>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton isActive={false}>
					{#snippet child({ props })}
						<button {...props} type="button" disabled={!studio || isCreatingChat} onclick={createChat}>
							<PlusIcon />
							<span>{studio ? (isCreatingChat ? 'Creating chat...' : 'New Chat') : 'Create a Studio first'}</span>
						</button>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>

			{#if recentChats.length > 0}
				{#each recentChats as chat (chat.id)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton isActive={isActive(chat.url)} tooltipContent={chat.title}>
							{#snippet child({ props })}
								<a href={chat.url} onclick={() => sidebar.isMobile && sidebar.setOpenMobile(false)} {...props}>
									<MessageSquareIcon />
									<span>{chat.title}</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/each}
			{:else}
				<Sidebar.MenuItem>
					<div class="rounded-xl border border-dashed border-sidebar-border/70 px-3 py-3 text-xs leading-relaxed text-sidebar-foreground/70">
						{studio ? 'No conversations yet for this Studio.' : 'Select or create a Studio to start a conversation.'}
					</div>
				</Sidebar.MenuItem>
			{/if}
		</Sidebar.Menu>
	</Sidebar.GroupContent>
</Sidebar.Group>

{#if enabledIntegrations.length > 0}
	<Sidebar.Group>
		<Sidebar.GroupLabel>Integrations</Sidebar.GroupLabel>
		<Sidebar.GroupContent>
			<Sidebar.Menu>
				{#each enabledIntegrations as integration (integration.id)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton isActive={isActive(integration.route)}>
							{#snippet child({ props })}
								<a href={integration.route} onclick={() => sidebar.isMobile && sidebar.setOpenMobile(false)} {...props}>
									<StudioIcon name={integration.icon ?? 'blocks'} class="size-4" />
									<span>{integration.title}</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/each}
			</Sidebar.Menu>
		</Sidebar.GroupContent>
	</Sidebar.Group>
{/if}
