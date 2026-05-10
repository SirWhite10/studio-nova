<script lang="ts">
	import BadgeDollarSignIcon from "@lucide/svelte/icons/badge-dollar-sign";
	import BellIcon from "@lucide/svelte/icons/bell";
	import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import UserCircle2Icon from "@lucide/svelte/icons/user-circle-2";
	import * as Avatar from "$lib/components/ui/avatar/index.js";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";

	let { user }: { user: { name: string; email: string; avatar?: string } } = $props();

	const sidebar = Sidebar.useSidebar();
	const fallbackInitials = $derived.by(() => {
		const source = user.name?.trim() || user.email?.trim() || "Nova User";
		const initials = source
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? "")
			.join("");
		return initials || "NU";
	});
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
						<Avatar.Root class="size-8 rounded-lg grayscale">
							<Avatar.Image src={user.avatar ?? undefined} alt={user.name} />
							<Avatar.Fallback class="rounded-lg">{fallbackInitials}</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-start text-sm leading-tight">
							<span class="truncate font-medium">{user.name}</span>
							<span class="text-muted-foreground truncate text-xs">
								{user.email}
							</span>
						</div>
						<EllipsisVerticalIcon class="ms-auto size-4" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
				side={sidebar.isMobile ? "bottom" : "right"}
				align="end"
				sideOffset={4}
			>
				<DropdownMenu.Label class="p-0 font-normal">
					<div class="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
						<Avatar.Root class="size-8 rounded-lg">
							<Avatar.Image src={user.avatar ?? undefined} alt={user.name} />
							<Avatar.Fallback class="rounded-lg">{fallbackInitials}</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-start text-sm leading-tight">
							<span class="truncate font-medium">{user.name}</span>
							<span class="text-muted-foreground truncate text-xs">
								{user.email}
							</span>
						</div>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					<DropdownMenu.Item>
						<UserCircle2Icon />
						Account
					</DropdownMenu.Item>
					<DropdownMenu.Item>
						<BadgeDollarSignIcon />
						Billing
					</DropdownMenu.Item>
					<DropdownMenu.Item>
						<BellIcon />
						Notifications
					</DropdownMenu.Item>
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				<DropdownMenu.Item>
					<LogOutIcon />
					Log out
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
