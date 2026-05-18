<script lang="ts">
	import { SvelteMap } from "svelte/reactivity";
	import CanvasRenderNodes from "$lib/base/canvas/render-nodes.svelte";
	import Text from "$lib/base/text/text.svelte";
	import Button from "$lib/components/view-ui/button/button.svelte";
	import type {
		CanvasComponentCatalog,
		CanvasNode,
		CanvasProviderActions,
		CanvasProviderData,
		ComponentRegistryValue,
		RenderComponentFn,
	} from "$lib/base/canvas/types.js";
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		layout = "split",
		contentAlignment = "start",
		textAlignment = "left",
		mediaVisible = true,
		mediaOverlayVisible = true,
		eyebrowText = "Data-driven hero block",
		titleText = "Build polished product UI with Canvas",
		descriptionText = "Explore reference-backed cards and reusable building blocks for editors, dashboards, and hand-authored app surfaces.",
		primaryActionLabel = "Browse Components",
		primaryActionHref = "/components/cards",
		secondaryActionLabel = "View Documentation",
		secondaryActionHref = "/auth-editor",
		mediaSrc = "https://assets.shadcnstore.com/shadcnstore.com/stock/marketing/fashion-template-preview.500w.76ef52.avif",
		mediaAlt = "Canvas component preview",
		overlayTitle = "Canvas preview",
		overlayDescription = "Reference-backed components for modern app surfaces",
		nodePath = [],
		nodeSlots = {},
		componentCatalog = {},
		customComponents = new SvelteMap<string, ComponentRegistryValue>(),
		providerData = {},
		providerActions = {},
		renderComponent = undefined,
	}: {
		class?: string;
		layout?: "split" | "stacked";
		contentAlignment?: "start" | "center";
		textAlignment?: "left" | "center";
		mediaVisible?: boolean;
		mediaOverlayVisible?: boolean;
		eyebrowText?: string;
		titleText?: string;
		descriptionText?: string;
		primaryActionLabel?: string;
		primaryActionHref?: string;
		secondaryActionLabel?: string;
		secondaryActionHref?: string;
		mediaSrc?: string;
		mediaAlt?: string;
		overlayTitle?: string;
		overlayDescription?: string;
		nodePath?: string[];
		nodeSlots?: Record<string, CanvasNode[]>;
		componentCatalog?: CanvasComponentCatalog;
		customComponents?: SvelteMap<string, ComponentRegistryValue>;
		providerData?: CanvasProviderData;
		providerActions?: CanvasProviderActions;
		renderComponent?: RenderComponentFn;
	} = $props();

	function hasSlot(slotName: string) {
		return (nodeSlots[slotName]?.length ?? 0) > 0;
	}

	const hasEyebrowSlot = $derived(hasSlot("eyebrow"));
	const hasTitleSlot = $derived(hasSlot("title"));
	const hasDescriptionSlot = $derived(hasSlot("description"));
	const hasActionsSlot = $derived(hasSlot("actions"));
	const hasMediaSlot = $derived(hasSlot("media"));
	const hasMediaOverlaySlot = $derived(hasSlot("mediaOverlay"));
	const hasMedia = $derived(
		mediaVisible && (hasMediaSlot || Boolean(mediaSrc) || (mediaOverlayVisible && (hasMediaOverlaySlot || overlayTitle || overlayDescription))),
	);
	const contentAlignmentClass = $derived(contentAlignment === "center" ? "items-center" : "items-start");
	const textAlignmentClass = $derived(
		textAlignment === "center" ? "text-center lg:text-center" : "text-center lg:text-left",
	);
	const actionsAlignmentClass = $derived(
		textAlignment === "center" ? "justify-center" : "justify-center lg:justify-start",
	);
	const layoutClass = $derived(layout === "stacked" ? "grid-cols-1" : "lg:grid-cols-2");
</script>

<section class={cn("w-full", className)}>
	<div class={cn("grid items-center gap-8 lg:gap-12", layoutClass)}>
		<div class={cn("flex flex-col gap-6", contentAlignmentClass, textAlignmentClass)}>
			<div class="flex flex-col gap-4">
				{#if hasEyebrowSlot}
					<CanvasRenderNodes
						nodes={nodeSlots.eyebrow}
						basePath={[...nodePath, "slot:eyebrow"]}
						{componentCatalog}
						{customComponents}
						{providerData}
						{providerActions}
						{renderComponent}
					/>
				{:else if eyebrowText}
					<div class="bg-primary/8 text-primary inline-flex w-fit items-center gap-2 self-center rounded-full border border-primary/15 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-sm lg:self-auto">
						<div class="bg-primary size-2 rounded-full shadow-[0_0_18px_hsl(var(--primary)/0.65)]"></div>
						<Text
							as="span"
							text={eyebrowText}
							size="sm"
							weight="medium"
							class="tracking-tight"
							style="font: inherit; color: inherit; line-height: inherit; letter-spacing: inherit;"
						/>
					</div>
				{/if}

				{#if hasTitleSlot}
					<CanvasRenderNodes
						nodes={nodeSlots.title}
						basePath={[...nodePath, "slot:title"]}
						{componentCatalog}
						{customComponents}
						{providerData}
						{providerActions}
						{renderComponent}
					/>
				{:else if titleText}
					<Text
						as="h1"
						text={titleText}
						size={{
							mode: "viewport",
							viewport: {
								base: "4xl",
								overrides: {
									md: "5xl",
									lg: "6xl",
								},
							},
							container: {
								base: "4xl",
							},
						}}
						weight="bold"
						letterSpacing="tight"
						class="text-balance"
						style="margin: 0;"
					/>
				{/if}

				{#if hasDescriptionSlot}
					<CanvasRenderNodes
						nodes={nodeSlots.description}
						basePath={[...nodePath, "slot:description"]}
						{componentCatalog}
						{customComponents}
						{providerData}
						{providerActions}
						{renderComponent}
					/>
				{:else if descriptionText}
					<Text
						as="p"
						text={descriptionText}
						size={{
							mode: "viewport",
							viewport: {
								base: "base",
								overrides: {
									md: "lg",
								},
							},
							container: {
								base: "base",
							},
						}}
						class="text-muted-foreground max-w-2xl text-balance"
						style="margin: 0;"
					/>
				{/if}
			</div>

			{#if hasActionsSlot}
				<div class={cn("flex flex-wrap items-center gap-4", actionsAlignmentClass)}>
					<CanvasRenderNodes
						nodes={nodeSlots.actions}
						basePath={[...nodePath, "slot:actions"]}
						{componentCatalog}
						{customComponents}
						{providerData}
						{providerActions}
						{renderComponent}
					/>
				</div>
			{:else if primaryActionLabel || secondaryActionLabel}
				<div class={cn("flex flex-wrap items-center gap-4", actionsAlignmentClass)}>
					{#if primaryActionLabel}
						<Button href={primaryActionHref} size="lg" class="h-10 px-8 py-2">
							<Text
								as="span"
								text={primaryActionLabel}
								size="sm"
								weight="medium"
								style="font: inherit; color: inherit; line-height: inherit; letter-spacing: inherit;"
							/>
						</Button>
					{/if}
					{#if secondaryActionLabel}
						<Button href={secondaryActionHref} variant="outline" size="lg" class="h-10 px-8 py-2">
							<Text
								as="span"
								text={secondaryActionLabel}
								size="sm"
								weight="medium"
								style="font: inherit; color: inherit; line-height: inherit; letter-spacing: inherit;"
							/>
						</Button>
					{/if}
				</div>
			{/if}
		</div>

		{#if hasMedia}
			<div class="group relative overflow-hidden rounded-xl">
				{#if hasMediaSlot}
					<CanvasRenderNodes
						nodes={nodeSlots.media}
						basePath={[...nodePath, "slot:media"]}
						{componentCatalog}
						{customComponents}
						{providerData}
						{providerActions}
						{renderComponent}
					/>
				{:else if mediaSrc}
					<div class="relative aspect-[16/9] size-full overflow-hidden">
						<img
							src={mediaSrc}
							alt={mediaAlt}
							class="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
							width="800"
							height="450"
							loading="eager"
							decoding="async"
						/>
						<div class="from-background/50 via-background/10 absolute inset-0 bg-gradient-to-t to-transparent"></div>
					</div>
				{/if}

				{#if mediaOverlayVisible && hasMediaOverlaySlot}
					<CanvasRenderNodes
						nodes={nodeSlots.mediaOverlay}
						basePath={[...nodePath, "slot:mediaOverlay"]}
						{componentCatalog}
						{customComponents}
						{providerData}
						{providerActions}
						{renderComponent}
					/>
				{:else if mediaOverlayVisible && (overlayTitle || overlayDescription)}
					<div class="absolute inset-x-4 bottom-4 z-10 rounded-xl border border-white/20 bg-black/30 p-4 backdrop-blur-sm">
						{#if overlayTitle}
							<Text as="p" text={overlayTitle} class="text-sm font-medium text-white" style="margin: 0;" />
						{/if}
						{#if overlayDescription}
							<Text
								as="p"
								text={overlayDescription}
								class="text-sm text-white/80"
								style="margin: 0;"
							/>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</section>
