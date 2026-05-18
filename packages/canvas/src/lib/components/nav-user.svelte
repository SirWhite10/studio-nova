<script lang="ts">
	import * as Avatar from "$lib/components/view-ui/avatar/index.js";
	import * as DropdownMenu from "$lib/components/view-ui/dropdown-menu/index.js";
	import * as Sidebar from "$lib/components/view-ui/sidebar/index.js";
	import Icon from "$lib/components/icon/icon.svelte";

	let {
		user,
	}: {
		user: { name: string; email: string; avatar: string };
	} = $props();

	const sidebar = Sidebar.useSidebar();
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton {...props} size="lg">
						<Avatar.Root style="border-radius: 0.5rem; filter: grayscale(1);">
							<Avatar.Image src={user.avatar} alt={user.name} />
							<Avatar.Fallback style="border-radius: 0.5rem;">CN</Avatar.Fallback>
						</Avatar.Root>
						<div style={`display: ${sidebar.isCollapsedToIcon ? "none" : "grid"}; flex: 1; min-width: 0; text-align: left; font-size: 0.875rem; line-height: 1.25rem;`}>
							<span style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{user.name}</span>
							<span style="color: oklch(0.556 0 0); font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{user.email}</span>
						</div>
						<Icon name="dots-vertical" size={16} stroke={1.75} style="margin-inline-start: auto; flex-shrink: 0;" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				style="min-width: 14rem; width: var(--bits-dropdown-menu-anchor-width, 14rem);"
				side={sidebar.isMobile ? "bottom" : "right"}
				align="end"
				sideOffset={4}
			>
				<DropdownMenu.Label style="padding: 0; color: inherit; font-weight: 400;">
					<div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.25rem; text-align: left; font-size: 0.875rem;">
						<Avatar.Root style="border-radius: 0.5rem;">
							<Avatar.Image src={user.avatar} alt={user.name} />
							<Avatar.Fallback style="border-radius: 0.5rem;">CN</Avatar.Fallback>
						</Avatar.Root>
						<div style="display: grid; min-width: 0; flex: 1; text-align: left; font-size: 0.875rem; line-height: 1.25rem;">
							<span style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{user.name}</span>
							<span style="color: oklch(0.556 0 0); font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{user.email}</span>
						</div>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					<DropdownMenu.Item>
						<Icon name="user-circle" size={16} stroke={1.75} />
						<span>Account</span>
					</DropdownMenu.Item>
					<DropdownMenu.Item>
						<Icon name="credit-card" size={16} stroke={1.75} />
						<span>Billing</span>
					</DropdownMenu.Item>
					<DropdownMenu.Item>
						<Icon name="notification" size={16} stroke={1.75} />
						<span>Notifications</span>
					</DropdownMenu.Item>
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				<DropdownMenu.Item>
					<Icon name="logout" size={16} stroke={1.75} />
					<span>Log out</span>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
