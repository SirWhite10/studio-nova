<script lang="ts">
	import type { Snippet } from "svelte";
	import { setThemeContext } from "./theme-store.svelte.js";
	import { resolveCanvasTheme, type CanvasResolvedThemeMode, type CanvasThemeConfig, type CanvasThemeMode } from "./types.js";

	let {
		theme = undefined,
		resolvedMode = undefined,
		setMode = undefined,
		children,
	}: {
		theme?: CanvasThemeConfig;
		resolvedMode?: CanvasResolvedThemeMode;
		setMode?: (mode: CanvasThemeMode) => void;
		children?: Snippet;
	} = $props();

	const resolvedTheme = $derived(resolveCanvasTheme(theme, resolvedMode));

	setThemeContext({
		get mode() {
			return resolvedTheme.mode;
		},
		get resolvedMode() {
			return resolvedTheme.resolvedMode;
		},
		get light() {
			return resolvedTheme.light;
		},
		get dark() {
			return resolvedTheme.dark;
		},
		get active() {
			return resolvedTheme.active;
		},
		setMode(mode) {
			setMode?.(mode);
		},
	});
</script>

{@render children?.()}
