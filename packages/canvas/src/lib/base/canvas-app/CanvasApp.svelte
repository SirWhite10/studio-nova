<script lang="ts">
	import { SvelteMap } from "svelte/reactivity";
	import Canvas from "$lib/base/canvas/canvas.svelte";
	import { createResponsiveQueryState } from "$lib/base/responsive/media-query.svelte.js";
	import { cn } from "$lib/utils.js";
	import { setCanvasAppContext } from "./context.js";
	import type { CanvasAppProps } from "./types.js";

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
		showSplash = false,
		class: className = "",
		children,
		...restProps
	}: CanvasAppProps = $props();

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
	});
</script>

<div class={cn("canvas-app relative w-full", className)} data-component="canvas-app" {...restProps}>
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
