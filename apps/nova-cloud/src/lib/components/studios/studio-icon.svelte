<script lang="ts">
	import BlocksIcon from "@lucide/svelte/icons/blocks";
	import BriefcaseBusinessIcon from "@lucide/svelte/icons/briefcase-business";
	import CreditCardIcon from "@lucide/svelte/icons/credit-card";
	import GithubIcon from "@lucide/svelte/icons/github";
	import Layers3Icon from "@lucide/svelte/icons/layers-3";
	import ShieldIcon from "@lucide/svelte/icons/shield";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
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
		github: GithubIcon,
		"credit-card": CreditCardIcon,
		shield: ShieldIcon,
		blocks: BlocksIcon,
	} as const;

	const Icon = $derived(iconMap[name as keyof typeof iconMap] ?? SparklesIcon);
</script>

<Icon class={className} />
