<script lang="ts">
	import NavUser from "$lib/components/nav-user.svelte";
	import NovaLogo from "$lib/components/nova-logo.svelte";
	import StudioGlobalSearch from "$lib/components/studios/studio-global-search.svelte";
	import StudioSidebarNav from "$lib/components/studios/studio-sidebar-nav.svelte";
	import StudioSwitcher from "$lib/components/studios/studio-switcher.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import type { StudioSidebarState } from "$lib/studios/types";
	import type { ComponentProps } from "svelte";

	interface Props extends ComponentProps<typeof Sidebar.Root> {
		data?: StudioSidebarState | null;
		oncreate?: () => void;
	}

	let {
		data = null,
		oncreate,
		...restProps
	}: Props = $props();

	const studios = $derived(data?.studios ?? []);
	const currentStudio = $derived(data?.currentStudio ?? null);
	const selectedStudioId = $derived(currentStudio?.id ?? null);
	const searchConfig = $derived(data?.search ?? { enabled: false, placeholder: "Search Nova" });
</script>

<Sidebar.Root variant="inset" collapsible="icon" {...restProps}>
	<Sidebar.Header class="gap-4 px-2 py-3">
		<a
			href="/app"
			class="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
		>
			<div class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary/12 font-semibold text-sidebar-primary">
				N
			</div>
			<NovaLogo href={undefined} size="md" class="group-data-[collapsible=icon]:hidden" />
		</a>

		{#if searchConfig.enabled}
			<StudioGlobalSearch
				selectedStudioId={selectedStudioId}
				placeholder={searchConfig.placeholder}
			/>
		{/if}

		<StudioSwitcher {studios} {currentStudio} {oncreate} />
	</Sidebar.Header>

	<Sidebar.Content class="gap-2 px-2 pb-2">
		<StudioSidebarNav
			studio={currentStudio}
			navigation={data?.navigation ?? null}
			footerLinks={data?.footerLinks ?? []}
		/>
	</Sidebar.Content>

	<Sidebar.Footer class="border-t border-sidebar-border/60 px-2 py-2">
		<NavUser
			user={data?.user ?? { name: "Nova User", email: "studio@nova.app", avatar: "" }}
		/>
	</Sidebar.Footer>
</Sidebar.Root>
