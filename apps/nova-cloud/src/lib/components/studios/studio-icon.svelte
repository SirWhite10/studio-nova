<script lang="ts">
	import BlocksIcon from "@lucide/svelte/icons/blocks";
	import BotIcon from "@lucide/svelte/icons/bot";
	import BriefcaseBusinessIcon from "@lucide/svelte/icons/briefcase-business";
	import BrainIcon from "@lucide/svelte/icons/brain";
	import CalendarClockIcon from "@lucide/svelte/icons/calendar-clock";
	import CreditCardIcon from "@lucide/svelte/icons/credit-card";
	import FolderIcon from "@lucide/svelte/icons/folder";
	import GithubIcon from "@lucide/svelte/icons/github";
	import ImageIcon from "@lucide/svelte/icons/image";
	import LifeBuoyIcon from "@lucide/svelte/icons/life-buoy";
	import Layers3Icon from "@lucide/svelte/icons/layers-3";
	import MessageSquareIcon from "@lucide/svelte/icons/message-square";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import SearchIcon from "@lucide/svelte/icons/search";
	import Settings2Icon from "@lucide/svelte/icons/settings-2";
	import ShieldIcon from "@lucide/svelte/icons/shield";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import WaypointsIcon from "@lucide/svelte/icons/waypoints";
	import WrenchIcon from "@lucide/svelte/icons/wrench";
	import PlugZapIcon from "@lucide/svelte/icons/plug-zap";
	import TerminalSquareIcon from "@lucide/svelte/icons/terminal-square";

	interface Props {
		name?: string;
		class?: string;
	}

	let { name = "sparkles", class: className = "" }: Props = $props();

	const iconMap = {
		sparkles: SparklesIcon,
		terminal: TerminalSquareIcon,
		layers: Layers3Icon,
		briefcase: BriefcaseBusinessIcon,
		bot: BotIcon,
		brain: BrainIcon,
		"calendar-clock": CalendarClockIcon,
		folder: FolderIcon,
		github: GithubIcon,
		"life-buoy": LifeBuoyIcon,
		"credit-card": CreditCardIcon,
		image: ImageIcon,
		"message-square": MessageSquareIcon,
		plus: PlusIcon,
		"plug-zap": PlugZapIcon,
		search: SearchIcon,
		"settings-2": Settings2Icon,
		shield: ShieldIcon,
		blocks: BlocksIcon,
		waypoints: WaypointsIcon,
		wrench: WrenchIcon,
	} as const;

	const Icon = $derived(iconMap[name as keyof typeof iconMap] ?? SparklesIcon);
</script>

<Icon class={className} />
