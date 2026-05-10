<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import CirclePlusIcon from "@lucide/svelte/icons/circle-plus";
	import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical";
	import MinusIcon from "@lucide/svelte/icons/minus";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import StudioIcon from "$lib/components/studios/studio-icon.svelte";
	import * as Collapsible from "$lib/components/ui/collapsible/index.js";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { useSidebar } from "$lib/components/ui/sidebar/index.js";
	import type {
		StudioSidebarItem,
		StudioSidebarLink,
		StudioSidebarNavigation,
		StudioSummary,
	} from "$lib/studios/types";

	interface Props {
		studio?: StudioSummary | null;
		navigation?: StudioSidebarNavigation | null;
		footerLinks?: StudioSidebarLink[];
	}

	let { studio = null, navigation = null, footerLinks = [] }: Props = $props();

	const sidebar = useSidebar();
	const sections = $derived(navigation?.sections ?? []);

	function isExternal(href: string) {
		return href.startsWith("mailto:") || href.startsWith("http://") || href.startsWith("https://");
	}

	function closeSidebarOnMobile() {
		if (sidebar.isMobile) {
			sidebar.setOpenMobile(false);
		}
	}

	async function navigate(href: string) {
		closeSidebarOnMobile();
		if (isExternal(href)) {
			window.location.href = href;
			return;
		}
		await goto(href);
	}

	function hrefMatches(href?: string) {
		if (!href || isExternal(href)) return false;

		const currentPath = page.url.pathname;
		const currentQuery = page.url.searchParams.toString();
		const [targetPath, targetQuery = ""] = href.split("?");

		if (currentPath === targetPath && (targetQuery === "" || currentQuery === targetQuery)) {
			return true;
		}

		return targetQuery === "" && currentPath.startsWith(`${targetPath}/`);
	}

	function itemHasChildren(item: StudioSidebarItem) {
		return (item.children?.length ?? 0) > 0;
	}

	function itemIsActive(item: StudioSidebarItem): boolean {
		if (hrefMatches(item.href)) return true;
		return item.children?.some((child) => itemIsActive(child)) ?? false;
	}

	function sectionIsActive(items: StudioSidebarItem[]) {
		return items.some((item) => itemIsActive(item));
	}

	function sectionStartsOpen(sectionId: string, items: StudioSidebarItem[]) {
		return sectionId === "integrations" || sectionIsActive(items);
	}

	function itemStartsOpen(item: StudioSidebarItem) {
		return itemIsActive(item);
	}
	
	function itemIndentClass(depth: number) {
		if (depth === 0) return "mx-0 border-l-0 px-0 py-1";
		if (depth === 1) return "mx-3.5 translate-x-px border-l px-2.5 py-0.5";
		return "mx-3 translate-x-px border-l px-2 py-0.5";
	}

	function leafClass(depth: number, hasManageMenu: boolean) {
		if (depth === 0) return hasManageMenu ? "pr-10" : "";
		return hasManageMenu ? "pr-10" : "";
	}
	
	function treeClass(depth: number, hasManageMenu: boolean) {
		if (depth === 0) return hasManageMenu ? "pr-16" : "";
		return hasManageMenu ? "pr-16" : "";
	}
</script>

{#snippet ManageMenu({ item }: { item: StudioSidebarItem })}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Sidebar.MenuAction
					{...props}
					class="top-1/2 right-1 -translate-y-1/2 rounded-md"
					aria-label={`Manage ${item.title}`}
				>
					<EllipsisVerticalIcon class="size-4" />
				</Sidebar.MenuAction>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" side="right" sideOffset={6} class="min-w-44 rounded-lg">
			{#if item.href}
				<DropdownMenu.Item onclick={() => navigate(item.href!)}>
					Open
				</DropdownMenu.Item>
			{/if}
			{#if item.manageKind === "agent"}
				<DropdownMenu.Item disabled>
					Rename agent
				</DropdownMenu.Item>
				<DropdownMenu.Item disabled>
					Customize icon
				</DropdownMenu.Item>
			{:else if item.manageKind === "integration"}
				<DropdownMenu.Item onclick={() => item.href && navigate(item.href)}>
					Manage integration
				</DropdownMenu.Item>
			{/if}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/snippet}

{#snippet TreeNode({ item, depth = 0 }: { item: StudioSidebarItem; depth?: number })}
	{@const hasChildren = itemHasChildren(item)}
	{@const isActive = itemIsActive(item)}
	{@const showManageMenu = depth === 0 && !!item.manageKind}

	{#if hasChildren}
		<Sidebar.MenuSubItem class="group/menu-item relative">
			<Collapsible.Root open={itemStartsOpen(item)} class="group/collapsible">
				<Collapsible.Trigger>
					{#snippet child({ props })}
						<Sidebar.MenuSubButton
							{...props}
							isActive={isActive}
							class={treeClass(depth, showManageMenu)}
						>
							<StudioIcon name={item.icon ?? "blocks"} class="size-3.5" />
							<span>{item.title}</span>
							{#if item.badge}
								<span class="ms-auto text-[10px] text-sidebar-foreground/70">{item.badge}</span>
							{/if}
							<PlusIcon class="ms-auto size-4 group-data-[state=open]/collapsible:hidden" />
							<MinusIcon class="ms-auto size-4 group-data-[state=closed]/collapsible:hidden" />
						</Sidebar.MenuSubButton>
					{/snippet}
				</Collapsible.Trigger>

				{#if showManageMenu}
					{@render ManageMenu({ item })}
				{/if}

						<Collapsible.Content>
							<Sidebar.MenuSub class={itemIndentClass(depth + 1)}>
								{#each item.children ?? [] as child (child.id)}
									{@render TreeNode({ item: child, depth: depth + 1 })}
								{/each}
							</Sidebar.MenuSub>
						</Collapsible.Content>
			</Collapsible.Root>
		</Sidebar.MenuSubItem>
	{:else}
		<Sidebar.MenuSubItem class="group/menu-item relative">
			<Sidebar.MenuSubButton isActive={isActive} class={leafClass(depth, showManageMenu)}>
				{#snippet child({ props })}
					<a href={item.href ?? "#"} onclick={closeSidebarOnMobile} {...props}>
						<StudioIcon name={item.icon ?? "blocks"} class="size-3.5" />
						<span>{item.title}</span>
						{#if item.badge}
							<span class="ms-auto text-[10px] text-sidebar-foreground/70">{item.badge}</span>
						{/if}
					</a>
				{/snippet}
			</Sidebar.MenuSubButton>
			{#if showManageMenu}
				{@render ManageMenu({ item })}
			{/if}
		</Sidebar.MenuSubItem>
	{/if}
{/snippet}

{#if sections.length > 0}
	<Sidebar.Group class="p-0">
		<Sidebar.Menu>
			{#each sections as section (section.id)}
				<Collapsible.Root
					open={sectionStartsOpen(section.id, section.items)}
					class="group/collapsible"
				>
					<Sidebar.MenuItem class="relative">
						<Collapsible.Trigger>
							{#snippet child({ props })}
								<Sidebar.MenuButton
									{...props}
									isActive={sectionIsActive(section.items)}
									class={section.action ? "pr-14" : ""}
								>
									<StudioIcon name={section.icon ?? "blocks"} class="size-4" />
									<span>{section.title}</span>
									<PlusIcon class="ms-auto size-4 group-data-[state=open]/collapsible:hidden" />
									<MinusIcon class="ms-auto size-4 group-data-[state=closed]/collapsible:hidden" />
								</Sidebar.MenuButton>
							{/snippet}
						</Collapsible.Trigger>

						{#if section.action}
							<button
								type="button"
								class="text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-1.5 right-1 flex size-5 items-center justify-center rounded-md outline-hidden transition-transform"
								aria-label={section.action.title}
								title={section.action.title}
								onclick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									void navigate(section.action.href);
								}}
							>
								<CirclePlusIcon class="size-4" />
							</button>
						{/if}

						<Collapsible.Content>
							{#if section.items.length > 0}
								<div class="border-sidebar-border mx-3.5 translate-x-px border-l px-2.5 py-0.5">
									<Sidebar.MenuSub class="mx-0 border-l-0 px-0 py-0.5">
									{#each section.items as item (item.id)}
										{@render TreeNode({ item })}
									{/each}
									</Sidebar.MenuSub>
								</div>
							{:else if section.emptyLabel}
								<div class="rounded-xl border border-dashed border-sidebar-border/70 px-3 py-3 text-xs leading-relaxed text-sidebar-foreground/70">
									{section.emptyLabel}
								</div>
							{/if}
						</Collapsible.Content>
					</Sidebar.MenuItem>
				</Collapsible.Root>
			{/each}
		</Sidebar.Menu>
	</Sidebar.Group>
{/if}

{#if footerLinks.length > 0}
	<Sidebar.Group class="mt-auto p-0 pt-2">
		<Sidebar.GroupContent>
			<Sidebar.Menu class="gap-1">
				{#each footerLinks as item (item.id)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton isActive={hrefMatches(item.href)} tooltipContent={item.title}>
							{#snippet child({ props })}
								{#if isExternal(item.href)}
									<a href={item.href} {...props}>
										<StudioIcon name={item.icon ?? "blocks"} class="size-4" />
										<span>{item.title}</span>
									</a>
								{:else}
									<a href={item.href} onclick={closeSidebarOnMobile} {...props}>
										<StudioIcon name={item.icon ?? "blocks"} class="size-4" />
										<span>{item.title}</span>
									</a>
								{/if}
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/each}
			</Sidebar.Menu>
		</Sidebar.GroupContent>
	</Sidebar.Group>
{:else if !studio}
	<Sidebar.Group class="mt-auto">
		<Sidebar.GroupContent>
			<div class="rounded-xl border border-dashed border-sidebar-border/70 px-3 py-3 text-xs leading-relaxed text-sidebar-foreground/70">
				Create a Studio to unlock chats, runtime, integrations, and files.
			</div>
		</Sidebar.GroupContent>
	</Sidebar.Group>
{/if}
