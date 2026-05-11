<script lang="ts">
	import {
		AppSidebar,
		ChartAreaInteractive,
		DataTable,
		Sidebar,
		SectionCards,
		SiteHeader
	} from "shadcn-svelte/components";
	import dashboardData from "./dashboard-data";
</script>

<Sidebar.Provider
	style="--sidebar-width: calc(var(--spacing) * 72); --header-height: calc(var(--spacing) * 12);"
>
	<AppSidebar variant="inset" />
	<Sidebar.Inset>
		<SiteHeader />
		<div class="flex flex-1 flex-col">
			<div class="@container/main flex flex-1 flex-col gap-2">
				<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
					<SectionCards />
					<div class="px-4 lg:px-6">
						<ChartAreaInteractive />
					</div>
					<DataTable data={dashboardData} />
				</div>
			</div>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
