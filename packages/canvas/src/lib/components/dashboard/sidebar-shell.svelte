<script lang="ts">
	import LogOut from "@lucide/svelte/icons/log-out";
	import Settings from "@lucide/svelte/icons/settings";
	import User from "@lucide/svelte/icons/user";
	import { View } from "$lib/base/view/index.js";
	import Icon from "$lib/components/icon/icon.svelte";
	import DropdownMenu from "$lib/components/view-ui/dropdown-menu.svelte";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import { setDashboardSidebarState } from "./sidebar-state.svelte.js";

	type NavItem = {
		title: string;
		icon:
			| "plus"
			| "dashboard"
			| "lifecycle"
			| "analytics"
			| "projects"
			| "team"
			| "mail"
			| "library"
			| "reports"
			| "word"
			| "settings"
			| "help"
			| "search"
			| "more";
		active?: boolean;
	};

	const mainItems: NavItem[] = [
		{ title: "Dashboard", icon: "dashboard", active: true },
		{ title: "Lifecycle", icon: "lifecycle" },
		{ title: "Analytics", icon: "analytics" },
		{ title: "Projects", icon: "projects" },
		{ title: "Team", icon: "team" },
	];

	const documentItems: NavItem[] = [
		{ title: "Data Library", icon: "library" },
		{ title: "Reports", icon: "reports" },
		{ title: "Word Assistant", icon: "word" },
		{ title: "More", icon: "more" },
	];

	const secondaryItems: NavItem[] = [
		{ title: "Settings", icon: "settings" },
		{ title: "Get Help", icon: "help" },
		{ title: "Search", icon: "search" },
	];

	let { children }: { children?: () => any } = $props();
	let collapsed = $state(false);
	let mobileOpen = $state(false);

	function toggleSidebar() {
		if (typeof window !== "undefined" && window.innerWidth < 1024) {
			mobileOpen = !mobileOpen;
			return;
		}

		collapsed = !collapsed;
	}

	function closeMobile() {
		mobileOpen = false;
	}

	const accountMenuItems = [
		{ id: "profile", label: "Profile", icon: User },
		{ id: "settings", label: "Settings", icon: Settings },
		{ id: "signout", label: "Sign out", icon: LogOut, destructive: true },
	];

	setDashboardSidebarState({
		get collapsed() {
			return collapsed;
		},
		get mobileOpen() {
			return mobileOpen;
		},
		toggle: toggleSidebar,
		closeMobile,
	});
</script>

<View
	display="flex"
	background={canvasTheme.colors.background}
	color={canvasTheme.colors.foreground}
	class="canvas-sidebar-shell"
	data-collapsed={collapsed}
	data-mobile-open={mobileOpen}
	style={`--sidebar-width: calc(var(--spacing, 0.25rem) * 72); --header-height: calc(var(--spacing, 0.25rem) * 12); min-height: 100dvh; width: 100%; font-family: ${canvasTheme.fonts.sans};`}
>
	{#if mobileOpen}
		<button
			type="button"
			class="canvas-sidebar-backdrop"
			aria-label="Close sidebar"
			onclick={closeMobile}
		></button>
	{/if}

	<aside
		class="canvas-sidebar"
		style={`width: var(--sidebar-width); background: ${canvasTheme.colors.sidebar}; color: ${canvasTheme.colors.sidebarForeground}; border-right: 1px solid ${canvasTheme.colors.border};`}
	>
		<div class="canvas-sidebar-inner">
			<div class="canvas-brand-row">
				<div class="canvas-brand-icon">
					<svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none">
						<circle cx="12" cy="12" r="8.25" stroke="currentColor" stroke-width="1.5" />
						<path d="M12 6.2v4.2" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" />
						<path d="M8.5 9.25h7" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" opacity="0.6" />
					</svg>
				</div>
				<span class="canvas-brand-text">Acme Inc.</span>
			</div>

			<div class="canvas-quick-row">
				<button type="button" class="canvas-quick-button">
					<span class="canvas-quick-icon">
						<Icon name="plus-filled" size={16} stroke={1.75} aria-hidden="true" />
					</span>
					<span>Quick Create</span>
				</button>
				<button type="button" class="canvas-utility-button" aria-label="Inbox">
					<Icon name="mail" size={16} stroke={1.75} aria-hidden="true" />
				</button>
			</div>

			<nav class="canvas-nav-group">
				{#each mainItems as item (item.title)}
					<a class:active={item.active} href="/">
						<span class="canvas-nav-icon" aria-hidden="true">
							<Icon
								name={item.icon === "projects" ? "folder" : item.icon}
								size={16}
								stroke={1.75}
							/>
						</span>
						<span>{item.title}</span>
					</a>
				{/each}
			</nav>

			<div class="canvas-nav-divider"></div>
			<div class="canvas-section-label">Documents</div>

			<nav class="canvas-nav-group">
				{#each documentItems as item (item.title)}
					<a href="/">
						<span class="canvas-nav-icon" aria-hidden="true">
							<Icon
								name={item.icon === "library" ? "database" : item.icon === "reports" ? "report" : item.icon}
								size={16}
								stroke={1.75}
							/>
						</span>
						<span>{item.title}</span>
					</a>
				{/each}
			</nav>

			<nav class="canvas-nav-group canvas-nav-secondary">
				{#each secondaryItems as item (item.title)}
					<a href="/">
						<span class="canvas-nav-icon" aria-hidden="true">
							<Icon name={item.icon} size={16} stroke={1.75} />
						</span>
						<span>{item.title}</span>
					</a>
				{/each}
			</nav>

			<div class="canvas-user-row">
				<div class="canvas-avatar">CN</div>
				<div class="canvas-user-copy">
					<span class="canvas-user-name">shadcn</span>
					<span class="canvas-user-email">m@example.com</span>
				</div>
				<DropdownMenu
					ariaLabel="More account actions"
					iconOnly={true}
					items={accountMenuItems}
					triggerClass="canvas-user-action"
					menuClass="canvas-sidebar-menu"
				>
					<Icon name="dots-vertical" size={16} stroke={1.75} aria-hidden="true" />
				</DropdownMenu>
			</div>
		</div>
	</aside>

	<View display="flex" flexDirection="column" style="min-width: 0; flex: 1; min-height: 100dvh;">
		{@render children?.()}
	</View>
</View>

<style>
	:global(.canvas-sidebar-shell) {
		position: relative;
		align-items: stretch;
	}

	.canvas-sidebar-backdrop {
		position: fixed;
		inset: 0;
		z-index: 29;
		border: none;
		background: rgb(15 23 42 / 0.28);
	}

	.canvas-sidebar {
		display: flex;
		flex-shrink: 0;
		height: 100dvh;
		overflow: hidden;
		z-index: 30;
		transition:
			transform 180ms ease,
			width 180ms ease,
			opacity 180ms ease;
	}

	.canvas-sidebar-inner {
		display: flex;
		height: 100%;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.75rem;
		box-sizing: border-box;
	}

	.canvas-brand-row,
	.canvas-nav-group a,
	.canvas-user-row,
	.canvas-quick-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.canvas-brand-row {
		padding: 0.25rem 0;
	}

	.canvas-brand-icon,
	.canvas-nav-icon,
	.canvas-avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.canvas-brand-icon {
		width: 1.125rem;
		height: 1.125rem;
	}

	.canvas-brand-text {
		font-size: 1rem;
		font-weight: 600;
	}

	.canvas-quick-row {
		gap: 0.5rem;
		align-items: center;
	}

	.canvas-quick-button {
		display: inline-flex;
		min-width: 0;
		flex: 1;
		align-items: center;
		gap: 0.625rem;
		min-height: 2rem;
		padding: 0 0.125rem 0 0;
		border: none;
		border-radius: 0.625rem;
		background: transparent;
		color: oklch(0.205 0 0);
		font-size: 0.875rem;
		font-weight: 500;
		justify-content: flex-start;
	}

	.canvas-quick-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.125rem;
		height: 1.125rem;
		border-radius: 999px;
		background: oklch(0.205 0 0);
		color: white;
		flex-shrink: 0;
	}

	.canvas-utility-button,
	:global(.canvas-user-action) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: 1px solid color-mix(in srgb, black 14%, transparent);
		border-radius: 0.625rem;
		background: white;
		color: inherit;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
	}

	.canvas-nav-group {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.canvas-nav-group a {
		min-height: 2.25rem;
		padding: 0 0.75rem;
		border-radius: 0.75rem;
		color: inherit;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition:
			background-color 160ms ease,
			color 160ms ease;
	}

	.canvas-nav-group a.active,
	.canvas-nav-group a:hover {
		background: color-mix(in srgb, black 8%, white);
	}

	.canvas-nav-icon {
		width: 1rem;
		height: 1rem;
		color: currentColor;
	}

	.canvas-nav-divider {
		height: 1px;
		background: color-mix(in srgb, black 14%, transparent);
		margin-top: 0.25rem;
	}

	.canvas-section-label {
		padding: 0 0.75rem;
		font-size: 0.875rem;
		color: color-mix(in srgb, black 70%, transparent);
	}

	.canvas-nav-secondary {
		margin-top: 0.25rem;
	}

	.canvas-user-row {
		margin-top: auto;
		padding: 0.625rem 0 0;
		border-top: 1px solid color-mix(in srgb, black 10%, transparent);
	}

	.canvas-avatar {
		width: 2rem;
		height: 2rem;
		border: 1px solid oklch(0.205 0 0);
		border-radius: 999px;
		background: white;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.canvas-user-copy {
		display: grid;
		min-width: 0;
		flex: 1;
		font-size: 0.875rem;
		line-height: 1.2;
	}

	.canvas-user-name {
		font-weight: 500;
	}

	.canvas-user-email {
		font-size: 0.75rem;
		color: color-mix(in srgb, black 55%, transparent);
	}

	:global(.canvas-user-action) {
		width: 1.75rem;
		height: 1.75rem;
		border-color: transparent;
		box-shadow: none;
		background: transparent;
	}

	:global(.canvas-sidebar-menu.canvas-dropdown-menu) {
		z-index: 260;
	}

	@media (max-width: 1023px) {
		.canvas-sidebar {
			position: fixed;
			top: 0;
			left: 0;
			transform: translateX(-100%);
			box-shadow: 0 24px 60px rgb(15 23 42 / 0.18);
		}

		:global(.canvas-sidebar-shell[data-mobile-open="true"]) .canvas-sidebar {
			transform: translateX(0);
		}
	}

	@media (min-width: 1024px) {
		.canvas-sidebar {
			position: sticky;
			top: 0;
		}

		:global(.canvas-sidebar-shell[data-collapsed="true"]) .canvas-sidebar {
			width: 0 !important;
			border-right-color: transparent !important;
			opacity: 0;
			transform: translateX(-0.75rem);
		}
	}
</style>
