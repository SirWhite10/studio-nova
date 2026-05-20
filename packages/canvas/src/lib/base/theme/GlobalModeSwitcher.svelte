<script lang="ts">
	import MonitorIcon from "@lucide/svelte/icons/monitor";
	import MoonIcon from "@lucide/svelte/icons/moon";
	import SunIcon from "@lucide/svelte/icons/sun";
	import { resetMode, setMode, userPrefersMode } from "mode-watcher";
	import { cn } from "$lib/utils.js";

	let {
		class: className = "",
	}: {
		class?: string;
	} = $props();

	const currentMode = $derived(userPrefersMode.current);

	const options = [
		{ value: "system", label: "System", icon: MonitorIcon },
		{ value: "light", label: "Light", icon: SunIcon },
		{ value: "dark", label: "Dark", icon: MoonIcon },
	] as const;

	function selectMode(mode: "system" | "light" | "dark") {
		if (mode === "system") {
			resetMode();
			return;
		}

		setMode(mode);
	}
</script>

<div class={cn("global-mode-switcher", className)} role="group" aria-label="Site theme mode">
	{#each options as option}
		<button
			type="button"
			class={cn("global-mode-switcher-button", currentMode === option.value && "global-mode-switcher-button-active")}
			onclick={() => selectMode(option.value)}
			aria-pressed={currentMode === option.value}
			aria-label={option.label}
			title={option.label}
		>
			<option.icon size={15} />
		</button>
	{/each}
</div>

<style>
	.global-mode-switcher {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.1875rem;
		border: 1px solid var(--border);
		border-radius: calc(var(--radius) + 0.25rem);
		background: color-mix(in oklab, var(--background), var(--muted) 24%);
	}

	.global-mode-switcher-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: 1px solid transparent;
		border-radius: calc(var(--radius) - 0.1rem);
		background: transparent;
		color: color-mix(in oklab, var(--foreground), transparent 28%);
		cursor: pointer;
	}

	.global-mode-switcher-button-active {
		border-color: var(--border);
		background: var(--background);
		color: var(--foreground);
		box-shadow: 0 1px 2px color-mix(in oklab, var(--foreground), transparent 92%);
	}
</style>
