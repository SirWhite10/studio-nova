<script lang="ts">
	import type { SVGAttributes } from "svelte/elements";
	import PanelLeftIcon from "@lucide/svelte/icons/panel-left";
	import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import ChevronsLeftIcon from "@lucide/svelte/icons/chevrons-left";
	import ChevronsRightIcon from "@lucide/svelte/icons/chevrons-right";
	import CameraIcon from "@tabler/icons-svelte/icons/camera";
	import ChartBarIcon from "@tabler/icons-svelte/icons/chart-bar";
	import ChevronDownIcon from "@tabler/icons-svelte/icons/chevron-down";
	import CreditCardIcon from "@tabler/icons-svelte/icons/credit-card";
	import CircleCheckFilledIcon from "@tabler/icons-svelte/icons/circle-check-filled";
	import CirclePlusFilledIcon from "@tabler/icons-svelte/icons/circle-plus-filled";
	import DashboardIcon from "@tabler/icons-svelte/icons/dashboard";
	import DatabaseIcon from "@tabler/icons-svelte/icons/database";
	import DotsIcon from "@tabler/icons-svelte/icons/dots";
	import DotsVerticalIcon from "@tabler/icons-svelte/icons/dots-vertical";
	import InnerShadowTopIcon from "@tabler/icons-svelte/icons/inner-shadow-top";
	import FileWordIcon from "@tabler/icons-svelte/icons/file-word";
	import FolderIcon from "@tabler/icons-svelte/icons/folder";
	import GripVerticalIcon from "@tabler/icons-svelte/icons/grip-vertical";
	import HelpIcon from "@tabler/icons-svelte/icons/help";
	import LayoutColumnsIcon from "@tabler/icons-svelte/icons/layout-columns";
	import ListDetailsIcon from "@tabler/icons-svelte/icons/list-details";
	import LoaderIcon from "@tabler/icons-svelte/icons/loader";
	import LogoutIcon from "@tabler/icons-svelte/icons/logout";
	import MailIcon from "@tabler/icons-svelte/icons/mail";
	import NotificationIcon from "@tabler/icons-svelte/icons/notification";
	import PlusIcon from "@tabler/icons-svelte/icons/plus";
	import ReportIcon from "@tabler/icons-svelte/icons/report";
	import SearchIcon from "@tabler/icons-svelte/icons/search";
	import SettingsIcon from "@tabler/icons-svelte/icons/settings";
	import UserCircleIcon from "@tabler/icons-svelte/icons/user-circle";
	import UsersIcon from "@tabler/icons-svelte/icons/users";

	type IconCollection = "lucide" | "tabler";
	type CanvasIconName =
		| "analytics"
		| "camera"
		| "check-filled"
		| "chevron-down"
		| "chevron-left"
		| "chevron-right"
		| "chevrons-left"
		| "chevrons-right"
		| "credit-card"
		| "dashboard"
		| "database"
		| "dots"
		| "dots-vertical"
		| "folder"
		| "grip"
		| "help"
		| "layout-columns"
		| "library"
		| "lifecycle"
		| "loader"
		| "logout"
		| "mail"
		| "more"
		| "notification"
		| "panel-left"
		| "plus"
		| "plus-filled"
		| "projects"
		| "report"
		| "reports"
		| "search"
		| "settings"
		| "team"
		| "user-circle"
		| "users"
		| "word";

	const lucideIcons = {
		"panel-left": PanelLeftIcon,
		"chevron-left": ChevronLeftIcon,
		"chevron-right": ChevronRightIcon,
		"chevrons-left": ChevronsLeftIcon,
		"chevrons-right": ChevronsRightIcon,
	} as const;

	const tablerIcons = {
		analytics: ChartBarIcon,
		camera: CameraIcon,
		"check-filled": CircleCheckFilledIcon,
		"chevron-down": ChevronDownIcon,
		"credit-card": CreditCardIcon,
		dashboard: DashboardIcon,
		database: DatabaseIcon,
		"dots-vertical": DotsVerticalIcon,
		dots: DotsIcon,
		folder: FolderIcon,
		grip: GripVerticalIcon,
		help: HelpIcon,
		"inner-shadow-top": InnerShadowTopIcon,
		"layout-columns": LayoutColumnsIcon,
		library: DatabaseIcon,
		lifecycle: ListDetailsIcon,
		loader: LoaderIcon,
		logout: LogoutIcon,
		mail: MailIcon,
		more: DotsIcon,
		notification: NotificationIcon,
		plus: PlusIcon,
		"plus-filled": CirclePlusFilledIcon,
		projects: FolderIcon,
		report: ReportIcon,
		reports: ReportIcon,
		search: SearchIcon,
		settings: SettingsIcon,
		team: UsersIcon,
		"user-circle": UserCircleIcon,
		users: UsersIcon,
		word: FileWordIcon,
	} as const;

	let {
		name,
		collection = "tabler",
		size = 16,
		color = "currentColor",
		stroke = "1.75",
		strokeWidth = "1.75",
		absoluteStrokeWidth = false,
		class: className = "",
		...restProps
	}: Omit<SVGAttributes<SVGSVGElement>, "color" | "stroke" | "strokeWidth"> & {
		name: CanvasIconName;
		collection?: IconCollection;
		size?: number | string;
		color?: string;
		stroke?: number | string;
		strokeWidth?: number | string;
		absoluteStrokeWidth?: boolean;
		class?: string;
	} = $props();

	const iconComponent = $derived.by(() =>
		collection === "lucide"
			? lucideIcons[name as keyof typeof lucideIcons]
			: tablerIcons[name as keyof typeof tablerIcons],
	);
</script>

{#if iconComponent}
	{@const IconComponent = iconComponent}
	{#if collection === "lucide"}
		{@const LucideIconComponent = IconComponent as any}
		{@const resolvedStrokeWidth = typeof strokeWidth === "number" ? `${strokeWidth}` : strokeWidth}
		<LucideIconComponent
			{size}
			{color}
			strokeWidth={resolvedStrokeWidth}
			{absoluteStrokeWidth}
			class={className}
			{...restProps}
		/>
	{:else}
		{@const TablerIconComponent = IconComponent as any}
		{@const resolvedStroke = typeof stroke === "number" ? `${stroke}` : stroke}
		<TablerIconComponent
			{size}
			{color}
			stroke={resolvedStroke}
			class={className}
			{...restProps}
		/>
	{/if}
{/if}
