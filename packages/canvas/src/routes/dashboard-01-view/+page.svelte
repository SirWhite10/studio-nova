<script lang="ts">
	import {
		ViewAppSidebar,
		ViewChartShell,
		ViewDashboardMain,
		ViewMetricCardSection,
		ViewSidebarPrimitive,
		ViewSiteHeader,
		ViewTableShell,
	} from "$lib/index.js";
	import dashboardData from "../dashboard-data.js";
</script>

<ViewSidebarPrimitive.Provider style="--sidebar-width: 16rem; --header-height: 3rem;">
	<ViewAppSidebar variant="inset" />
	<ViewSidebarPrimitive.Inset>
		<ViewSiteHeader />
		<ViewDashboardMain>
			<ViewMetricCardSection />
			<ViewChartShell />
			<ViewTableShell data={dashboardData} />
		</ViewDashboardMain>
	</ViewSidebarPrimitive.Inset>
</ViewSidebarPrimitive.Provider>
