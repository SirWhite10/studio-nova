<script lang="ts">
	import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { useSidebar } from "$lib/components/ui/sidebar/index.js";
	import { goto } from "$app/navigation";
	import StudioIcon from "$lib/components/studios/studio-icon.svelte";
	import type { StudioSummary } from "$lib/studios/types";

	interface Props {
		studios: StudioSummary[];
		currentStudio?: StudioSummary | null;
		oncreate?: () => void;
	}

	let { studios = [], currentStudio = null, oncreate }: Props = $props();

	const sidebar = useSidebar();

	async function navigate(url: string) {
		if (sidebar.isMobile) sidebar.setOpenMobile(false);
		await goto(url);
	}

	const studioLabel = $derived(currentStudio?.name ?? "Create your first studio");
	const studioMeta = $derived(
		currentStudio
			? currentStudio.runtimeStatus === "active"
				? "Runtime active"
				: currentStudio.runtimeLabel
			: "No Studios yet",
	);
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						{...props}
						size="lg"
						class="bg-transparent data-[active=true]:bg-transparent data-[state=open]:bg-sidebar-accent/15 data-[state=open]:text-sidebar-foreground hover:bg-sidebar-accent/10"
					>
						<div class="flex size-8 items-center justify-center rounded-xl bg-sidebar-primary/10 text-sidebar-primary">
							<StudioIcon name={currentStudio?.icon ?? "sparkles"} class="size-4" />
						</div>
						<div class="grid flex-1 text-start text-sm leading-tight">
							<span class="truncate font-medium">{studioLabel}</span>
							<span class="truncate text-xs text-muted-foreground">{studioMeta}</span>
						</div>
						<ChevronsUpDownIcon class="ms-auto size-4" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-(--bits-dropdown-menu-anchor-width) min-w-64 rounded-lg"
				side={sidebar.isMobile ? "bottom" : "right"}
				align="start"
				sideOffset={8}
			>
				<DropdownMenu.Label class="text-xs uppercase tracking-[0.18em] text-muted-foreground">
					Studios
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				{#if studios.length === 0}
					<DropdownMenu.Item onclick={() => oncreate?.() ?? navigate('/app')}>
						<PlusIcon />
						Create your first studio
					</DropdownMenu.Item>
				{:else}
					{#each studios as studio (studio.id)}
						<DropdownMenu.Item onclick={() => navigate(studio.url)}>
							<div class="flex size-7 items-center justify-center rounded-lg bg-muted text-foreground">
								<StudioIcon name={studio.icon} class="size-3.5" />
							</div>
							<div class="flex min-w-0 flex-1 flex-col">
								<span class="truncate">{studio.name}</span>
								<span class="truncate text-xs text-muted-foreground">{studio.runtimeLabel}</span>
							</div>
						</DropdownMenu.Item>
					{/each}
					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={() => oncreate?.() ?? navigate('/app')}>
						<PlusIcon />
						New Studio
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
