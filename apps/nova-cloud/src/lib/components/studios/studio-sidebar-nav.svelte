<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import StudioIcon from "$lib/components/studios/studio-icon.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { useSidebar } from "$lib/components/ui/sidebar/index.js";
	import type {
		StudioSidebarLink,
		StudioSidebarNavigation,
		StudioSummary,
	} from "$lib/studios/types";

	interface Props {
		studio?: StudioSummary | null;
		navigation?: StudioSidebarNavigation | null;
		footerLinks?: StudioSidebarLink[];
	}

	let {
		studio = null,
		navigation = null,
		footerLinks = [],
	}: Props = $props();

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

	function hrefMatches(href: string) {
		if (!href || isExternal(href)) return false;

		const currentPath = page.url.pathname;
		const currentQuery = page.url.searchParams.toString();
		const [targetPath, targetQuery = ""] = href.split("?");

		if (currentPath === targetPath && (targetQuery === "" || currentQuery === targetQuery)) {
			return true;
		}

		return targetQuery === "" && currentPath.startsWith(`${targetPath}/`);
	}
</script>

{#if sections.length > 0}
	{#each sections as section (section.id)}
		<Sidebar.Group class="relative">
			<Sidebar.GroupLabel>{section.title}</Sidebar.GroupLabel>
			{#if section.action}
				{@const sectionAction = section.action}
				<Sidebar.GroupAction
					type="button"
					aria-label={sectionAction.title}
					title={sectionAction.title}
					onclick={() => navigate(sectionAction.href)}
				>
					<StudioIcon name={sectionAction.icon ?? "plus"} class="size-4" />
				</Sidebar.GroupAction>
			{/if}

			<Sidebar.GroupContent>
				{#if section.items.length > 0}
					<Sidebar.Menu>
						{#each section.items as item (item.id)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={hrefMatches(item.href)} tooltipContent={item.title}>
									{#snippet child({ props })}
										<a href={item.href} onclick={closeSidebarOnMobile} {...props}>
											<StudioIcon name={item.icon ?? section.icon ?? "blocks"} class="size-4" />
											<span>{item.title}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
								{#if item.badge}
									<Sidebar.MenuBadge>{item.badge}</Sidebar.MenuBadge>
								{/if}
								{#if item.children && item.children.length > 0}
									<Sidebar.MenuSub>
										{#each item.children as child (child.id)}
											<Sidebar.MenuSubItem>
												<Sidebar.MenuSubButton
													href={child.href}
													isActive={hrefMatches(child.href)}
													onclick={closeSidebarOnMobile}
												>
													<StudioIcon
														name={child.icon ?? item.icon ?? "message-square"}
														class="size-3.5"
													/>
													<span>{child.title}</span>
												</Sidebar.MenuSubButton>
											</Sidebar.MenuSubItem>
										{/each}
									</Sidebar.MenuSub>
								{/if}
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				{:else if section.emptyLabel}
					<div class="rounded-xl border border-dashed border-sidebar-border/70 px-3 py-3 text-xs leading-relaxed text-sidebar-foreground/70">
						{section.emptyLabel}
					</div>
				{/if}
			</Sidebar.GroupContent>
		</Sidebar.Group>
	{/each}
{/if}

{#if footerLinks.length > 0}
	<Sidebar.Group class="mt-auto pt-2">
		<Sidebar.GroupContent>
			<Sidebar.Menu>
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
