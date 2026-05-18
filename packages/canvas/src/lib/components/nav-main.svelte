<script lang="ts">
	import { Button } from "$lib/components/view-ui/button/index.js";
	import * as Sidebar from "$lib/components/view-ui/sidebar/index.js";
	import Icon from "$lib/components/icon/icon.svelte";

	let {
		items,
	}: {
		items: {
			title: string;
			url: string;
			icon?: "dashboard" | "lifecycle" | "analytics" | "projects" | "team";
		}[];
	} = $props();

	const sidebar = Sidebar.useSidebar();
</script>

<Sidebar.Group>
	<Sidebar.GroupContent style="display: flex; flex-direction: column; gap: 0.5rem;">
		<Sidebar.Menu>
			<Sidebar.MenuItem style="display: flex; align-items: center; gap: 0.5rem;">
				{@render ViewButtonRow()}
			</Sidebar.MenuItem>
			{#each items as item (item.title)}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton tooltipContent={item.title}>
						{#snippet child({ props })}
							<a href={item.url} {...props}>
								{#if item.icon}
									<Icon
										name={item.icon === "projects" ? "folder" : item.icon}
										size={16}
										stroke={1.75}
									/>
								{/if}
								<span>{item.title}</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/each}
		</Sidebar.Menu>
	</Sidebar.GroupContent>
</Sidebar.Group>

{#snippet ViewButtonRow()}
	<div style="display: flex; align-items: center; gap: 0.5rem;">
		<Sidebar.MenuButton
			style="background: oklch(0.205 0 0); color: white; border: 1px solid oklch(0.205 0 0); min-width: 2rem; transition-duration: 200ms; transition-timing-function: ease-linear;"
			tooltipContent="Quick create"
		>
			<Icon name="plus-filled" size={16} stroke={1.75} />
			<span>Quick Create</span>
		</Sidebar.MenuButton>
		<Button
			size="icon-sm"
			variant="outline"
			aria-label="Inbox"
			style={`width: 2rem; height: 2rem; ${sidebar.isCollapsedToIcon ? "opacity: 0;" : ""}`}
		>
			<Icon name="mail" size={16} stroke={1.75} />
			<span class="sr-only">Inbox</span>
		</Button>
	</div>
{/snippet}
