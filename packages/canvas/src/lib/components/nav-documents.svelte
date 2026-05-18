<script lang="ts">
	import * as DropdownMenu from "$lib/components/view-ui/dropdown-menu/index.js";
	import * as Sidebar from "$lib/components/view-ui/sidebar/index.js";
	import Icon from "$lib/components/icon/icon.svelte";

	let {
		items,
	}: {
		items: {
			name: string;
			url: string;
			icon: "library" | "reports" | "word";
		}[];
	} = $props();

	const sidebar = Sidebar.useSidebar();
</script>

<Sidebar.Group style={sidebar.isCollapsedToIcon ? "display: none;" : ""}>
	<Sidebar.GroupLabel>Documents</Sidebar.GroupLabel>
	<Sidebar.Menu>
		{#each items as item (item.name)}
			<Sidebar.MenuItem>
				<Sidebar.MenuButton tooltipContent={item.name}>
					{#snippet child({ props })}
						<a href={item.url} {...props}>
							<Icon
								name={item.icon === "library" ? "database" : item.icon === "reports" ? "report" : item.icon}
								size={16}
								stroke={1.75}
							/>
							<span>{item.name}</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuAction {...props} showOnHover style="border-radius: 0.125rem;">
								<Icon name="dots" size={16} stroke={1.75} />
								<span class="sr-only">More</span>
							</Sidebar.MenuAction>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						style="min-width: 6rem;"
						side={sidebar.isMobile ? "bottom" : "right"}
						align={sidebar.isMobile ? "end" : "start"}
					>
						<DropdownMenu.Item>
							<Icon name="folder" size={16} stroke={1.75} />
							<span>Open</span>
						</DropdownMenu.Item>
						<DropdownMenu.Item>
							<Icon name="plus" size={16} stroke={1.75} />
							<span>Share</span>
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item variant="destructive">
							<Icon name="more" size={16} stroke={1.75} />
							<span>Delete</span>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</Sidebar.MenuItem>
		{/each}
		<Sidebar.MenuItem>
			<Sidebar.MenuButton style="color: color-mix(in srgb, currentColor 70%, transparent);">
				<Icon name="dots" size={16} stroke={1.75} color="color-mix(in srgb, currentColor 70%, transparent)" />
				<span>More</span>
			</Sidebar.MenuButton>
		</Sidebar.MenuItem>
	</Sidebar.Menu>
</Sidebar.Group>
