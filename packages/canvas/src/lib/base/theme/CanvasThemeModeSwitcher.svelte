<script lang="ts">
	import MonitorIcon from "@lucide/svelte/icons/monitor";
	import MoonIcon from "@lucide/svelte/icons/moon";
	import SunIcon from "@lucide/svelte/icons/sun";
	import { cn } from "$lib/utils.js";
	import { getThemeContext } from "./theme-store.svelte.js";
	import type { CanvasThemeMode } from "./types.js";

	let {
		mode = undefined,
		onModeChange = undefined,
		variant = "select",
		class: className = "",
	}: {
		mode?: CanvasThemeMode;
		onModeChange?: (mode: CanvasThemeMode) => void;
		variant?: "select" | "segmented";
		class?: string;
	} = $props();

	const themeContext = getThemeContext();
	const currentMode = $derived(mode ?? themeContext?.mode ?? "system");

	function setMode(nextMode: CanvasThemeMode) {
		themeContext?.setMode(nextMode);
		onModeChange?.(nextMode);
	}

	const options = [
		{ value: "system", label: "System", icon: MonitorIcon },
		{ value: "light", label: "Light", icon: SunIcon },
		{ value: "dark", label: "Dark", icon: MoonIcon },
	] satisfies Array<{ value: CanvasThemeMode; label: string; icon: typeof MonitorIcon }>;
</script>

{#if variant === "segmented"}
	<div class={cn("canvas-theme-mode-switcher-segmented", className)} role="group" aria-label="Canvas app theme mode">
		{#each options as option}
			<button
				type="button"
				class={cn("canvas-theme-mode-switcher-button", currentMode === option.value && "canvas-theme-mode-switcher-button-active")}
				onclick={() => setMode(option.value)}
				aria-pressed={currentMode === option.value}
			>
				<option.icon size={15} />
				<span>{option.label}</span>
			</button>
		{/each}
	</div>
{:else}
	<label class={cn("canvas-theme-mode-switcher-select", className)}>
		<span>Theme</span>
		<select value={currentMode} onchange={(event) => setMode((event.currentTarget as HTMLSelectElement).value as CanvasThemeMode)}>
			{#each options as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</label>
{/if}

<style>
	.canvas-theme-mode-switcher-select,
	.canvas-theme-mode-switcher-segmented {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font: inherit;
	}

	.canvas-theme-mode-switcher-select span {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--muted-foreground);
	}

	.canvas-theme-mode-switcher-select select,
	.canvas-theme-mode-switcher-button {
		min-height: 2.25rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--background);
		color: var(--foreground);
		font: inherit;
		font-size: 0.86rem;
		font-weight: 600;
	}

	.canvas-theme-mode-switcher-select select {
		padding: 0 0.75rem;
	}

	.canvas-theme-mode-switcher-segmented {
		padding: 0.1875rem;
		border: 1px solid var(--border);
		border-radius: calc(var(--radius) + 0.25rem);
		background: var(--muted);
	}

	.canvas-theme-mode-switcher-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		border-color: transparent;
		background: transparent;
		padding: 0 0.625rem;
		cursor: pointer;
	}

	.canvas-theme-mode-switcher-button-active {
		border-color: var(--border);
		background: var(--background);
		box-shadow: 0 1px 2px color-mix(in oklab, var(--foreground), transparent 90%);
	}
</style>
