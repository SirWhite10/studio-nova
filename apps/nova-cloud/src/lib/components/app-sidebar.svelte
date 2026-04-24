<script lang="ts">
	import CommandIcon from "@lucide/svelte/icons/command";
	import LifeBuoyIcon from "@lucide/svelte/icons/life-buoy";
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import SendIcon from "@lucide/svelte/icons/send";
	import SettingsIcon from "@lucide/svelte/icons/settings";
	import type { ComponentProps } from "svelte";
	import { onMount } from "svelte";

	import NavSecondary from "./nav-secondary.svelte";
	import NavUser from "./nav-user.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Progress } from "$lib/components/ui/progress/index.js";
	import StudioSidebarNav from "$lib/components/studios/studio-sidebar-nav.svelte";
	import StudioSwitcher from "$lib/components/studios/studio-switcher.svelte";
	import { useFileUploadManager } from "$lib/files/upload-manager.svelte";
	import NovaLogo from "$lib/components/nova-logo.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { chatStore } from "$lib/nova/chat";
	import { userStore } from "$lib/user-store.svelte";
	import type { StudioIntegration, StudioSummary } from "$lib/studios/types";

	type SidebarData = {
		user?: {
			name: string;
			email: string;
			avatar: string;
		};
		studios?: StudioSummary[];
		currentStudio?: StudioSummary | null;
		integrations?: StudioIntegration[];
		navSecondary?: { title: string; url: string; icon: any }[];
	};

	const defaultData: SidebarData = {
		user: {
			name: "Nova User",
			email: "studio@nova.app",
			avatar: "/avatars/shadcn.jpg",
		},
		studios: [],
		currentStudio: null,
		integrations: [],
		navSecondary: [
			{ title: "Support", url: "#", icon: LifeBuoyIcon },
			{ title: "Feedback", url: "#", icon: SendIcon },
			{ title: "App Settings", url: "/app/settings", icon: SettingsIcon },
		],
	};

	let {
		ref = $bindable(null),
		data = defaultData,
		oncreate,
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & { data?: SidebarData; oncreate?: () => void } = $props();

	const fileUploadManager = useFileUploadManager();

	onMount(() => {
		userStore.load();
		void chatStore.loadChats({ silent: true });
	});

	const resolvedStudios = $derived.by(() => {
		const studios = data?.studios ?? defaultData.studios ?? [];
		if (chatStore.chats.length === 0) return studios;

		return studios.map((studio) => {
			const liveChats = chatStore.chats
				.filter((chat) => chat.studioId === studio.id)
				.slice(0, 3)
				.map((chat) => ({
					id: chat.id,
					title: chat.title,
					url: chat.url,
				}));

			const chatCount = chatStore.chats.filter((chat) => chat.studioId === studio.id).length;
			return {
				...studio,
				chatCount: chatCount || studio.chatCount,
				chatPreview: liveChats.length > 0 ? liveChats : studio.chatPreview,
			};
		});
	});
	const resolvedStudio = $derived.by(() => {
		const currentStudio = data?.currentStudio ?? defaultData.currentStudio ?? null;
		if (!currentStudio) return null;
		return resolvedStudios.find((studio) => studio.id === currentStudio.id) ?? currentStudio;
	});
	const resolvedIntegrations = $derived(data?.integrations ?? defaultData.integrations ?? []);
	const resolvedSecondary = $derived(data?.navSecondary ?? defaultData.navSecondary ?? []);
	const resolvedUser = $derived(data?.user ?? userStore.user ?? defaultData.user!);
	const uploadCards = $derived.by(() =>
		fileUploadManager.batches
			.map((batch) => {
				const totalCount = batch.items.length;
				const completedCount = batch.items.filter((item) => item.status === "completed").length;
				const failedItems = batch.items.filter((item) => item.status === "failed");
				const activeCount = batch.items.filter(
					(item) => item.status === "queued" || item.status === "uploading",
				).length;
				const totalBytes = batch.items.reduce((sum, item) => sum + item.totalBytes, 0);
				const uploadedBytes = batch.items.reduce((sum, item) => sum + item.uploadedBytes, 0);

				return {
					...batch,
					totalCount,
					completedCount,
					failedCount: failedItems.length,
					activeCount,
					totalBytes,
					uploadedBytes,
					progressPercent: totalBytes ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)) : 0,
					firstError: failedItems[0]?.error ?? null,
				};
			})
			.filter((batch) => batch.activeCount > 0 || batch.failedCount > 0),
	);
</script>

<Sidebar.Root bind:ref variant="inset" {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg">
					{#snippet child({ props })}
						<a href="/app" {...props}>
							<div class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
								<CommandIcon class="size-4" />
							</div>
							<NovaLogo size="sm" class="flex flex-1 text-start text-sm leading-tight truncate" />
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
		<StudioSwitcher studios={resolvedStudios} currentStudio={resolvedStudio} {oncreate} />
	</Sidebar.Header>

	<Sidebar.Content>
		<StudioSidebarNav studio={resolvedStudio} integrations={resolvedIntegrations} />
		{#if uploadCards.length > 0}
			<Sidebar.Group class="mt-auto">
				<Sidebar.GroupContent class="space-y-3">
					{#each uploadCards as batch (batch.id)}
						<div class="rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/40 px-3 py-3 text-sidebar-foreground shadow-xs">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0 space-y-1">
									<p class="truncate text-sm font-medium">
										{batch.totalCount === 1 ? "Uploading 1 file" : `Uploading ${batch.totalCount} files`}
									</p>
									<p class="text-xs text-sidebar-foreground/70">
										{batch.completedCount}/{batch.totalCount}
										{#if batch.failedCount > 0}
											· {batch.failedCount} failed
										{/if}
									</p>
									{#if batch.path}
										<p class="truncate text-xs text-sidebar-foreground/60">/{batch.path}</p>
									{:else}
										<p class="text-xs text-sidebar-foreground/60">Root</p>
									{/if}
									{#if batch.firstError}
										<p class="line-clamp-2 text-xs text-destructive">{batch.firstError}</p>
									{/if}
								</div>
								<p class="text-xs font-medium text-sidebar-foreground/70">{batch.progressPercent}%</p>
							</div>
							<Progress
								value={batch.progressPercent}
								class="mt-3 h-1.5 bg-sidebar-border/70 [&>[data-slot=progress-indicator]]:bg-sidebar-primary"
							/>
							<div class="mt-3 flex flex-wrap gap-2">
								<Button
									variant="outline"
									size="sm"
									class="rounded-full"
									onclick={() => fileUploadManager.cancelBatch(batch.id)}
								>
									Cancel
								</Button>
								{#if batch.failedCount > 0 && batch.activeCount === 0}
									<Button size="sm" class="rounded-full" onclick={() => fileUploadManager.retryBatch(batch.id)}>
										<RotateCcwIcon class="size-3.5" />
										Retry failed
									</Button>
								{/if}
							</div>
						</div>
					{/each}
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/if}
		<NavSecondary items={resolvedSecondary} class={uploadCards.length > 0 ? undefined : "mt-auto"} />
	</Sidebar.Content>

	<Sidebar.Footer>
		<NavUser user={resolvedUser} />
	</Sidebar.Footer>
</Sidebar.Root>
