<script lang="ts">
	import { mode as siteMode } from "mode-watcher";
	import { SvelteMap } from "svelte/reactivity";
	import Canvas from "$lib/base/canvas/canvas.svelte";
	import ThemeProvider from "$lib/base/theme/ThemeProvider.svelte";
	import { generateThemeVariables, resolveCanvasTheme } from "$lib/base/theme/types.js";
	import { createResponsiveQueryState } from "$lib/base/responsive/media-query.svelte.js";
	import { cn } from "$lib/utils.js";
	import { setCanvasAppContext } from "./context.js";
	import type { CanvasAppProps } from "./types.js";
	import type { CanvasThemeMode } from "$lib/base/theme/types.js";

	let {
		document = undefined,
		components = [],
		providers = [],
		providerData = {},
		providerActions = {},
		componentCatalog = {},
		customComponents = new SvelteMap(),
		renderComponent = undefined,
		config = {},
		themeMode = undefined,
		resolvedThemeMode = undefined,
		onThemeModeChange = undefined,
		showSplash = false,
		class: className = "",
		children,
		...restProps
	}: CanvasAppProps = $props();

	let localThemeMode = $state<CanvasThemeMode | undefined>(themeMode);
	const effectiveThemeConfig = $derived({
		...config.theme,
		mode: themeMode ?? localThemeMode ?? config.theme?.mode,
	});
	const inheritedMode = $derived(resolvedThemeMode ?? siteMode.current ?? undefined);

	let resolvedProviders = $derived(document?.providers ?? providers);
	let resolvedProviderData = $derived.by(() => {
		const entries = resolvedProviders.map((provider) => [provider.name, provider.props ?? {}] as const);
		return {
			...Object.fromEntries(entries),
			...providerData,
		};
	});

	let responsiveQueryState = createResponsiveQueryState({
		config: config.responsive,
		mode: config.responsive?.defaultMode,
	});

	const resolvedTheme = $derived(resolveCanvasTheme(effectiveThemeConfig, inheritedMode));
	const themeStyle = $derived.by(() => {
		const activeThemeVariables = generateThemeVariables(resolvedTheme.active);
		const sharedThemeVariables = generateThemeVariables({
			"font-sans": resolvedTheme.active["font-sans"],
			"font-serif": resolvedTheme.active["font-serif"],
			"font-mono": resolvedTheme.active["font-mono"],
			spacing: resolvedTheme.active.spacing,
			"shadow-color": resolvedTheme.active["shadow-color"],
			"shadow-opacity": resolvedTheme.active["shadow-opacity"],
			"shadow-blur": resolvedTheme.active["shadow-blur"],
			"shadow-spread": resolvedTheme.active["shadow-spread"],
			"shadow-offset-x": resolvedTheme.active["shadow-offset-x"],
			"shadow-offset-y": resolvedTheme.active["shadow-offset-y"],
			"letter-spacing": resolvedTheme.active["letter-spacing"],
		});
		return [activeThemeVariables, sharedThemeVariables].filter(Boolean).join("; ");
	});

	function setThemeMode(mode: CanvasThemeMode) {
		localThemeMode = mode;
		onThemeModeChange?.(mode);
	}

	setCanvasAppContext({
		get config() {
			return config;
		},
		get providerData() {
			return resolvedProviderData;
		},
		get providerActions() {
			return providerActions;
		},
		get responsiveQueryState() {
			return responsiveQueryState;
		},
		get theme() {
			return {
				...resolvedTheme,
				setMode: setThemeMode,
			};
		},
	});
</script>

<ThemeProvider theme={effectiveThemeConfig} resolvedMode={resolvedTheme.resolvedMode} setMode={setThemeMode}>
	<div
		class={cn("canvas-app relative w-full", resolvedTheme.resolvedMode === "dark" && "dark", className)}
		data-component="canvas-app"
		data-theme-mode={resolvedTheme.mode}
		data-resolved-theme-mode={resolvedTheme.resolvedMode}
		style={themeStyle}
		{...restProps}
	>
		{#if showSplash && config.splash?.enabled}
			<div class={cn("grid min-h-[min(60vh,32rem)] place-items-center gap-3 p-8 text-center", config.splash.class)}>
				{#if config.splash.title}
					<h2 class="m-0 text-2xl font-bold">{config.splash.title}</h2>
				{/if}
				{#if config.splash.description}
					<p class="m-0 max-w-[40rem] text-current/70">{config.splash.description}</p>
				{/if}
			</div>
		{:else if children}
			{@render children()}
		{:else}
			<Canvas
				{document}
				{components}
				providers={resolvedProviders}
				providerData={resolvedProviderData}
				{providerActions}
				{componentCatalog}
				{customComponents}
				{renderComponent}
			/>
		{/if}
	</div>
</ThemeProvider>
