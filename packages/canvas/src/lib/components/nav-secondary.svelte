<script lang="ts">
	import * as Sidebar from "$lib/components/view-ui/sidebar/index.js";
	import Icon from "$lib/components/icon/icon.svelte";

	let {
		items,
		style = "",
	}: {
		items: { title: string; url: string; icon: "settings" | "help" | "search" }[];
		style?: string;
	} = $props();
</script>

<Sidebar.Group style={style}>
	<Sidebar.GroupContent>
		<Sidebar.Menu>
			{#each items as item (item.title)}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton tooltipContent={item.title}>
						{#snippet child({ props })}
							<a href={item.url} {...props}>
								<Icon name={item.icon} size={16} stroke={1.75} />
								<span>{item.title}</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/each}
		</Sidebar.Menu>
	</Sidebar.GroupContent>
</Sidebar.Group>
