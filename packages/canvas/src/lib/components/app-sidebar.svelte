<script lang="ts">
	import Icon from "$lib/components/icon/icon.svelte";
	import * as Sidebar from "$lib/components/view-ui/sidebar/index.js";
	import NavDocuments from "./nav-documents.svelte";
	import NavMain from "./nav-main.svelte";
	import NavSecondary from "./nav-secondary.svelte";
	import NavUser from "./nav-user.svelte";

	let {
		side = "left",
		variant = "inset",
		collapsible = "offcanvas",
		...restProps
	}: {
		side?: "left" | "right";
		variant?: "sidebar" | "floating" | "inset";
		collapsible?: "offcanvas" | "icon" | "none";
		[key: string]: unknown;
	} = $props();

	const data = {
		user: {
			name: "shadcn",
			email: "m@example.com",
			avatar: "/avatars/shadcn.jpg",
		},
		navMain: [
			{ title: "Dashboard", url: "#", icon: "dashboard" as const },
			{ title: "Lifecycle", url: "#", icon: "lifecycle" as const },
			{ title: "Analytics", url: "#", icon: "analytics" as const },
			{ title: "Projects", url: "#", icon: "projects" as const },
			{ title: "Team", url: "#", icon: "team" as const },
		],
		navSecondary: [
			{ title: "Settings", url: "#", icon: "settings" as const },
			{ title: "Get Help", url: "#", icon: "help" as const },
			{ title: "Search", url: "#", icon: "search" as const },
		],
		documents: [
			{ name: "Data Library", url: "#", icon: "library" as const },
			{ name: "Reports", url: "#", icon: "reports" as const },
			{ name: "Word Assistant", url: "#", icon: "word" as const },
		],
	};
</script>

<Sidebar.Root {side} {variant} {collapsible} {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton style="padding: 0.375rem;">
					{#snippet child({ props })}
						<a href="##" {...props}>
							<Icon name="inner-shadow-top" size={20} stroke={1.75} />
							<span style="font-size: 1rem; font-weight: 600; line-height: 1.5rem;">Acme Inc.</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain items={data.navMain} />
		<NavDocuments items={data.documents} />
		<NavSecondary items={data.navSecondary} style="margin-top: auto;" />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser user={data.user} />
	</Sidebar.Footer>
</Sidebar.Root>
