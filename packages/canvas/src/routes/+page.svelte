<script lang="ts">
	import * as Avatar from "$lib/shadcn-components/ui/avatar/index.js";
	import * as Accordion from "$lib/shadcn-components/ui/accordion/index.js";
	import * as Badge from "$lib/shadcn-components/ui/badge/index.js";
	import * as Button from "$lib/shadcn-components/ui/button/index.js";
	import * as Card from "$lib/shadcn-components/ui/card/index.js";
	import * as Dialog from "$lib/shadcn-components/ui/dialog/index.js";
	import * as NavigationMenu from "$lib/shadcn-components/ui/navigation-menu/index.js";
	import { navigationMenuTriggerStyle } from "$lib/shadcn-components/ui/navigation-menu/navigation-menu-trigger.svelte";
	import { cn } from "$lib/shadcn-components/utils.js";
	import { IsMobile } from "$lib/hooks/is-mobile.svelte.js";
	import type { HTMLAttributes } from "svelte/elements";
	import {
		ArrowRight,
		BadgeCheck,
		Ellipsis,
		Flame,
		GalleryHorizontalEnd,
		Heart,
		Menu,
		MessageCircle,
		Repeat2,
		Send,
		Sparkles,
		Star,
		Trophy,
		UserPlus,
	} from "@lucide/svelte";

	type ListItemProps = HTMLAttributes<HTMLAnchorElement> & {
		title: string;
		href: string;
		content: string;
	};

	const isMobile = new IsMobile();

	const templateHighlights = [
		{
			title: "Landing Pages",
			href: "/components/cards",
			description: "Hero sections, pricing blocks, testimonials, and polished marketing surfaces.",
		},
		{
			title: "Dashboards",
			href: "/dashboard-01-view",
			description: "Analytics layouts, metrics cards, and app shells for internal tools.",
		},
		{
			title: "Commerce",
			href: "/components/cards",
			description: "Product grids, offer cards, merchandising modules, and storefront sections.",
		},
		{
			title: "Auth",
			href: "/auth-demo",
			description: "Sign in, onboarding, password reset, and account entry flows.",
		},
	];

	function handleHomeClick(event: MouseEvent) {
		if (window.location.pathname === "/") {
			event.preventDefault();
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	}

	const moreLinks = [
		{ title: "Blog", href: "/blog", description: "Product notes, releases, and UI thinking." },
		{ title: "Changelog", href: "/changelog", description: "Track updates across components and demos." },
		{ title: "GitHub", href: "https://github.com/", description: "Browse the source and follow development." },
		{ title: "Playground", href: "/auth-editor", description: "Try the editor and explore interactive surfaces." },
		{ title: "Landing Canvas", href: "/landing-canvas", description: "Preview the Canvas-rendered hero block with slot-based composition." },
		{ title: "Roadmap", href: "/roadmap", description: "See what component categories are coming next." },
		{ title: "Contact", href: "/contact", description: "Reach out about integrations, usage, or feedback." },
	];

	const productCards = [
		{
			title: "Classic White Sneakers",
			description: "Comfortable everyday wear",
			price: "$29",
			compareAt: "$49",
			discount: "50% OFF",
			rating: "4.5",
			reviews: "1.2k",
			image: "https://assets.shadcnstore.com/shadcnstore.com/stock/e-commerce/classic-white-sneakers.500w.c5398d.avif",
			badge: "Trending",
			badgeIcon: Flame,
		},
		{
			title: "Urban Sport Jacket",
			description: "Lightweight & water-resistant",
			price: "$47",
			compareAt: "$70",
			discount: "33% OFF",
			rating: "4.8",
			reviews: "850",
			image: "https://assets.shadcnstore.com/shadcnstore.com/stock/e-commerce/urban-sport-jacket.500w.5ece9e.avif",
			badge: "Bestseller",
			badgeIcon: Trophy,
		},
		{
			title: "Casual Denim Shirt",
			description: "100% cotton comfort",
			price: "$23",
			compareAt: "$35",
			discount: "33% OFF",
			rating: "4.3",
			reviews: "620",
			image: "https://assets.shadcnstore.com/shadcnstore.com/stock/e-commerce/casual-denim-shirt.500w.cbab8e.avif",
		},
		{
			title: "Premium Wool Sweater",
			description: "Warm & stylish design",
			price: "$52",
			compareAt: "$70",
			discount: "25% OFF",
			rating: "4.6",
			reviews: "450",
			image: "https://assets.shadcnstore.com/shadcnstore.com/stock/e-commerce/premium-wool-sweater.800w.b234d4.avif",
			badge: "New Arrival",
			badgeIcon: Sparkles,
		},
	];
</script>

{#snippet ListItem({
	title,
	content,
	href,
	class: className,
	...restProps
}: ListItemProps)}
	<li>
		<NavigationMenu.Link>
			{#snippet child()}
				<a
					{href}
					class={cn(
						"hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block space-y-1 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none",
						className,
					)}
					{...restProps}
				>
					<div class="text-sm leading-none font-medium">{title}</div>
					<p class="text-muted-foreground line-clamp-2 text-sm leading-snug">
						{content}
					</p>
				</a>
			{/snippet}
		</NavigationMenu.Link>
	</li>
{/snippet}

<svelte:head>
	<title>Canvas UI Library</title>
	<meta
		name="description"
		content="Canvas is a standalone UI library for data-driven composition, visual editing, and reusable application surfaces."
	/>
</svelte:head>

<div class="min-h-dvh bg-background text-foreground">
	<div class="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 py-6 md:px-10 md:py-8">
		<header class="sticky top-0 z-40 rounded-b-2xl border border-border/60 bg-background/80 px-3 py-2 sm:px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
			<div class="flex items-center justify-between gap-4">
				<a href="/" class="px-3 text-sm font-semibold tracking-tight" onclick={handleHomeClick}>@studio/canvas</a>
				<Dialog.Root>
					<Dialog.Trigger class="border-border/60 bg-background shadow-xs inline-flex size-9 items-center justify-center rounded-md border md:hidden">
						<Menu class="size-4" />
						<span class="sr-only">Open navigation menu</span>
					</Dialog.Trigger>
					<Dialog.Content class="max-h-[85dvh] overflow-y-auto p-0 sm:max-w-lg" showCloseButton={false}>
						<div class="border-border/60 flex items-center justify-between border-b px-5 py-4">
							<div>
								<h2 class="text-base font-semibold tracking-tight">Navigation</h2>
								<p class="text-muted-foreground text-sm">Browse Canvas pages, templates, and demos.</p>
							</div>
							<Dialog.Close class="border-border/60 bg-background shadow-xs inline-flex size-9 items-center justify-center rounded-md border text-sm font-medium">
								Close
							</Dialog.Close>
						</div>

						<div class="flex flex-col p-3">
							<a href="/" class="hover:bg-primary/8 rounded-lg px-3 py-3 text-sm font-medium transition-colors" onclick={handleHomeClick}>Home</a>
							<a href="/components" class="hover:bg-primary/8 rounded-lg px-3 py-3 text-sm font-medium transition-colors">Components</a>
							<a href="/docs" class="hover:bg-primary/8 rounded-lg px-3 py-3 text-sm font-medium transition-colors">Docs</a>
							<a href="/landing-canvas" class="hover:bg-primary/8 rounded-lg px-3 py-3 text-sm font-medium transition-colors">Landing Canvas</a>

							<Accordion.Root type="multiple" class="mt-2 flex flex-col gap-2">
								<Accordion.Item value="templates" class="border-border/60 rounded-xl border px-3">
									<Accordion.Trigger class="py-3 text-sm font-medium no-underline hover:no-underline">
										Templates
									</Accordion.Trigger>
									<Accordion.Content>
										<div class="flex flex-col gap-1 pb-3">
											<a href="/templates" class="hover:bg-primary/8 rounded-lg px-3 py-2 text-sm font-medium transition-colors">View all templates</a>
											{#each templateHighlights as template (template.title)}
												<a href={template.href} class="hover:bg-primary/8 rounded-lg px-3 py-2 transition-colors">
													<div class="text-sm font-medium">{template.title}</div>
													<p class="text-muted-foreground text-xs leading-5">{template.description}</p>
												</a>
											{/each}
										</div>
									</Accordion.Content>
								</Accordion.Item>

								<Accordion.Item value="more" class="border-border/60 rounded-xl border px-3">
									<Accordion.Trigger class="py-3 text-sm font-medium no-underline hover:no-underline">
										More
									</Accordion.Trigger>
									<Accordion.Content>
										<div class="flex flex-col gap-1 pb-3">
											{#each moreLinks as link (link.title)}
												<a href={link.href} class="hover:bg-primary/8 rounded-lg px-3 py-2 transition-colors">
													<div class="text-sm font-medium">{link.title}</div>
													<p class="text-muted-foreground text-xs leading-5">{link.description}</p>
												</a>
											{/each}
										</div>
									</Accordion.Content>
								</Accordion.Item>
							</Accordion.Root>
						</div>
					</Dialog.Content>
				</Dialog.Root>
				<div class="hidden md:block">
				<NavigationMenu.Root viewport={isMobile.current}>
					<NavigationMenu.List class="flex-wrap justify-end gap-2">
						<NavigationMenu.Item>
							<NavigationMenu.Link>
								{#snippet child()}
									<a href="/" class={cn(navigationMenuTriggerStyle(), "border border-border/60 bg-background shadow-xs hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary")} onclick={handleHomeClick}>Home</a>
								{/snippet}
							</NavigationMenu.Link>
						</NavigationMenu.Item>
						<NavigationMenu.Item>
							<NavigationMenu.Link>
								{#snippet child()}
									<a href="/components" class={cn(navigationMenuTriggerStyle(), "border border-border/60 bg-background shadow-xs hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary")}>Components</a>
								{/snippet}
							</NavigationMenu.Link>
						</NavigationMenu.Item>
						<NavigationMenu.Item>
							<NavigationMenu.Link>
								{#snippet child()}
									<a href="/docs" class={cn(navigationMenuTriggerStyle(), "border border-border/60 bg-background shadow-xs hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary")}>Docs</a>
								{/snippet}
							</NavigationMenu.Link>
						</NavigationMenu.Item>
						<NavigationMenu.Item>
							<NavigationMenu.Trigger class="h-9 border border-border/60 bg-background px-5 shadow-xs hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary">Templates</NavigationMenu.Trigger>
							<NavigationMenu.Content class="md:right-0 md:left-auto">
								<ul class="grid gap-2 p-2 md:w-[420px] lg:w-[560px] lg:grid-cols-[0.9fr_1.1fr]">
									<li class="row-span-5">
										<NavigationMenu.Link>
											{#snippet child({ props })}
												<a {...props} href="/components/cards" class="from-primary/10 to-muted flex h-full w-full flex-col justify-end rounded-md bg-gradient-to-b p-5 no-underline outline-hidden select-none focus:shadow-md">
													<div class="mb-2 text-lg font-medium">Template Library</div>
													<p class="text-muted-foreground text-sm leading-tight">
														A curated set of landing pages, dashboards, commerce, auth, marketing, SaaS, portfolio, blog, settings, admin, analytics, and booking patterns.
													</p>
												</a>
											{/snippet}
										</NavigationMenu.Link>
									</li>
									{#each templateHighlights as template (template.title)}
										{@render ListItem({ href: template.href, title: template.title, content: template.description })}
									{/each}
									<li class="lg:col-span-full">
										<NavigationMenu.Link>
											{#snippet child()}
												<a href="/templates" class="text-primary hover:bg-primary/5 focus:bg-primary/5 block rounded-md border border-dashed border-border/70 p-3 text-sm font-medium transition-colors outline-none">
													View all templates →
												</a>
											{/snippet}
										</NavigationMenu.Link>
									</li>
								</ul>
							</NavigationMenu.Content>
						</NavigationMenu.Item>
						<NavigationMenu.Item>
							<NavigationMenu.Trigger class="h-9 border border-border/60 bg-background px-5 shadow-xs hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary">More</NavigationMenu.Trigger>
							<NavigationMenu.Content class="md:right-0 md:left-auto">
								<ul class="grid w-[320px] gap-2 p-2 md:w-[420px] md:grid-cols-2">
									{#each moreLinks as link (link.title)}
										{@render ListItem({ href: link.href, title: link.title, content: link.description })}
									{/each}
								</ul>
							</NavigationMenu.Content>
						</NavigationMenu.Item>
					</NavigationMenu.List>
				</NavigationMenu.Root>
				</div>
			</div>
		</header>
		<section class="w-full py-2 md:py-4 lg:py-6">
			<div class="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
				<div class="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">					<div class="flex flex-col gap-4">
						<h1 class="text-4xl font-bold tracking-tight text-balance md:text-5xl lg:text-6xl">
							Build polished product UI with Canvas
						</h1>
						<p class="text-muted-foreground max-w-2xl text-balance text-base md:text-lg">
							Explore reference-backed cards and reusable building blocks for editors,
							dashboards, and hand-authored app surfaces.
						</p>
					</div>

					<div class="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
						<Button.Root href="/components/cards" size="lg" class="h-10 px-8 py-2">
							Browse Components
						</Button.Root>
						<Button.Root href="/auth-editor" variant="outline" size="lg" class="h-10 px-8 py-2">
							View Documentation
						</Button.Root>
					</div>
				</div>

				<div class="group relative overflow-hidden rounded-xl">
					<Card.Root class="overflow-hidden border-0 py-0 shadow-lg">
						<Card.Content class="p-0">
							<div class="relative aspect-[16/9] size-full overflow-hidden">
								<img
									src="https://assets.shadcnstore.com/shadcnstore.com/stock/marketing/fashion-template-preview.500w.76ef52.avif"
									alt="Canvas component preview"
									class="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
									width="800"
									height="450"
								/>
								<div class="from-background/50 via-background/10 absolute inset-0 bg-gradient-to-t to-transparent" />

								<div class="absolute inset-x-4 bottom-4 rounded-xl border border-white/20 bg-black/30 p-4 backdrop-blur-sm">
									<p class="text-sm font-medium text-white">Canvas preview</p>
									<p class="text-sm text-white/80">Reference-backed components for modern app surfaces</p>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			</div>
		</section>


		<section class="flex flex-col gap-6">
			<div class="flex flex-col gap-2">
				<h2 class="text-2xl font-semibold tracking-tight">Card showcase</h2>
				<p class="max-w-2xl text-sm leading-6 text-muted-foreground">
					These are the first Tailwind-backed reference components in Canvas. The goal is to
					show the range of card patterns we need to support before rebuilding the full
					dashboard and editor integrations.
				</p>
			</div>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				<Card.Root class="mx-auto w-full max-w-md">
					<Card.Header class="flex items-center justify-between gap-3">
						<div class="flex items-center gap-3">
							<Avatar.Root class="ring-ring size-10 ring-2">
								<Avatar.Image src="https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png" alt="Philip George" />
								<Avatar.Fallback class="text-xs">PG</Avatar.Fallback>
							</Avatar.Root>
							<div class="flex flex-col gap-0.5">
								<Card.Title class="flex items-center gap-1 text-sm">
									Philip George
									<BadgeCheck class="size-4 fill-sky-600 stroke-white dark:fill-sky-400" />
								</Card.Title>
								<Card.Description>@philip20</Card.Description>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<Button.Root variant="outline" size="sm" class="px-3 py-2">
								<UserPlus class="size-4" />
								Follow
							</Button.Root>
							<Button.Root variant="ghost" size="icon" aria-label="Toggle menu">
								<Ellipsis class="size-4" />
							</Button.Root>
						</div>
					</Card.Header>
					<Card.Content class="space-y-6 text-sm">
						<img
							src="https://cdn.shadcnstudio.com/ss-assets/components/card/image-6.png?width=350&format=auto"
							alt="Banner"
							class="aspect-video w-full rounded-md object-cover"
						/>
						<p>
							Lost in the colors of the night 🌌✨ Sometimes the blur reveals more than clarity.
							<a href="#" class="text-sky-600 dark:text-sky-400">#AbstractVibes</a>
							<a href="#" class="text-sky-600 dark:text-sky-400">#Dreamscape</a>
							<a href="#" class="text-sky-600 dark:text-sky-400">#VisualPoetry</a>
						</p>
					</Card.Content>
					<Card.Footer class="flex items-center justify-evenly gap-1">
						<Button.Root variant="ghost" size="sm">
							<Heart class="size-4" />
							2.1K
						</Button.Root>
						<Button.Root variant="ghost" size="sm">
							<MessageCircle class="size-4" />
							1.4K
						</Button.Root>
						<Button.Root variant="ghost" size="sm">
							<Repeat2 class="size-4" />
							669
						</Button.Root>
						<Button.Root variant="ghost" size="sm">
							<Send class="size-4" />
							1.1K
						</Button.Root>
					</Card.Footer>
				</Card.Root>

				<div class="relative mx-auto max-w-md rounded-xl bg-gradient-to-r from-neutral-600 to-violet-300 pt-0 shadow-lg">
					<div class="flex h-60 items-center justify-center">
						<img
							src="https://cdn.shadcnstudio.com/ss-assets/components/card/image-11.png?width=300&format=auto"
							alt="Shoes"
							class="w-75"
						/>
					</div>
					<Button.Root
						variant="ghost"
						size="icon"
						class="absolute top-4 right-4 rounded-full"
					>
						<Heart class="stroke-white size-4" />
						<span class="sr-only">Like</span>
					</Button.Root>
					<Card.Root class="border-none">
						<Card.Header>
							<Card.Title>Nike Jordan Air Rev</Card.Title>
							<Card.Description class="flex items-center gap-2">
								<Badge.Badge variant="outline" class="rounded-sm">EU38</Badge.Badge>
								<Badge.Badge variant="outline" class="rounded-sm">Black and White</Badge.Badge>
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<p>
								Crossing hardwood comfort with off-court flair. '80s-inspired construction,
								bold details and nothin'-but-net style.
							</p>
						</Card.Content>
						<Card.Footer class="justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
							<div class="flex flex-col">
								<span class="text-sm font-medium uppercase">Price</span>
								<span class="text-xl font-semibold">$69.99</span>
							</div>
							<Button.Root size="lg">Add to cart</Button.Root>
						</Card.Footer>
					</Card.Root>
				</div>

				<Card.Root class="group relative mx-auto flex w-full max-w-md flex-col gap-2 overflow-hidden pt-0">
					<div class="aspect-video overflow-hidden">
						<img
							src="https://assets.shadcnstore.com/shadcnstore.com/stock/marketing/fashion-template-preview.500w.76ef52.avif"
							alt="Web Development - Development"
							class="size-full object-cover grayscale transition-all duration-500 group-hover:scale-105"
							width="600"
							height="338"
						/>
					</div>
					<Card.Header class="flex-1 pt-4">
						<div class="mb-3 flex items-center justify-between gap-3">
							<Badge.Badge variant="secondary" class="h-auto rounded-md px-2.5 py-0.5 font-semibold">
								Development
							</Badge.Badge>
							<div class="flex items-center gap-1">
								<Star class="fill-foreground size-4" />
								<span class="text-sm font-medium">4.9</span>
							</div>
						</div>
						<Card.Title class="text-xl font-semibold text-balance">Web Development</Card.Title>
					</Card.Header>
					<Card.Content>
						<p class="text-muted-foreground line-clamp-2 text-sm">
							Professional development services tailored to your business needs. Scalable solutions that drive results.
						</p>
					</Card.Content>
					<Card.Footer class="flex flex-col items-start gap-4 border-t-0 bg-transparent pt-4">
						<div class="flex w-full items-baseline justify-between gap-3">
							<div>
								<span class="text-foreground text-2xl font-bold">$2999</span>
								<span class="text-muted-foreground text-sm"> / project</span>
							</div>
							<span class="text-muted-foreground text-sm">2-4 weeks</span>
						</div>
						<Button.Root class="h-9 w-full cursor-pointer px-4 py-2">
							Get Started
							<ArrowRight class="size-4" />
						</Button.Root>
					</Card.Footer>
				</Card.Root>
			</div>

		</section>

		<section class="flex flex-col gap-6">
			<div class="flex flex-col gap-2">
				<h2 class="text-2xl font-semibold tracking-tight">Product Cards</h2>
				<p class="max-w-2xl text-sm leading-6 text-muted-foreground">
					Commerce-focused product cards with quick actions, ratings, and promotional badges.
				</p>
			</div>

			<div class="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2 xl:grid-cols-4">
				{#each productCards as product (product.title)}
					<Card.Root class="group relative gap-1 overflow-hidden rounded-md py-0 shadow-none ring-1 ring-foreground/10 transition-all hover:shadow-md">
						<div class="relative aspect-square w-full overflow-hidden">
							<div
								class="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-300"
								style={`background-image: url('${product.image}')`}
								role="img"
								aria-label={product.title}
							></div>
							{#if product.badge && product.badgeIcon}
								<div class="absolute start-2 top-2 z-20">
									<Badge.Badge class="bg-black/45 text-primary border-white/10 h-auto gap-1 border px-2 py-1 font-semibold shadow-md backdrop-blur-lg">
										<product.badgeIcon class="size-3" />
										<span class="text-xs font-medium">{product.badge}</span>
									</Badge.Badge>
								</div>
							{/if}
							<div class="bg-black/45 text-primary border-white/10 absolute start-2 bottom-2 z-10 flex items-center gap-1 rounded-md border px-2 py-1 text-sm shadow-md backdrop-blur-lg">
								<Star class="size-4 fill-current" />
								<span>{product.rating}</span>
								<span class="text-primary/85">| {product.reviews}</span>
							</div>
							<div class="absolute end-2 bottom-2 z-10">
								<Button.Root variant="glass" size="sm" class="group/similar relative size-8 cursor-pointer overflow-hidden rounded-full p-0 text-xs transition-all duration-200 hover:w-[130px]" aria-label="View similar products">
									<GalleryHorizontalEnd class="absolute start-2 size-4 shrink-0" />
									<span class="ms-6 whitespace-nowrap opacity-0 transition-opacity group-hover/similar:opacity-100">VIEW SIMILAR</span>
								</Button.Root>
							</div>
							<Button.Root variant="glass" size="icon" class="absolute end-2 top-2 z-20 size-8 cursor-pointer rounded-full p-0" aria-label="Add to wishlist">
								<Heart class="text-destructive hover:fill-destructive size-4 transition-colors" />
							</Button.Root>
						</div>
						<Card.Header class="gap-2 p-4 pb-2">
							<Card.Title class="text-base font-medium text-balance">{product.title}</Card.Title>
							<Card.Description class="text-sm text-balance">{product.description}</Card.Description>
						</Card.Header>
						<Card.Footer class="items-center gap-2 px-4 pb-4 pt-0">
							<span class="font-semibold">{product.price}</span>
							<span class="text-muted-foreground text-sm line-through">{product.compareAt}</span>
							<span class="text-sm">({product.discount})</span>
						</Card.Footer>
					</Card.Root>
				{/each}
			</div>
		</section>

		<footer class="w-full py-16">
			<div class="mx-auto w-full max-w-7xl">
				<div class="mb-8 flex items-center gap-3">
					<div class="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl border border-primary/20 text-sm font-bold">
						@
					</div>
					<span class="text-2xl font-semibold">@studio/canvas</span>
				</div>
				<p class="text-muted-foreground mb-8 max-w-lg text-sm leading-6">
					A reference-backed UI library for Studio surfaces, reusable templates, and data-driven component composition.
				</p>
				<div class="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4 lg:grid-cols-6">
					<div class="col-span-2 me-8 flex flex-col gap-4 md:col-span-4 lg:col-span-2">
						<h4 class="text-foreground text-base font-medium">Subscribe for Canvas updates</h4>
						<form class="relative">
							<input
								class="border-muted-foreground/20 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-10 w-full min-w-0 rounded-lg border bg-transparent pe-12 px-3 text-sm outline-none transition-colors focus-visible:ring-3"
								placeholder="Email address"
								type="email"
							/>
							<Button.Root variant="outline" size="icon" class="absolute end-1 top-1 size-8 cursor-pointer rounded-lg p-0">
								<ArrowRight class="size-4" />
							</Button.Root>
						</form>
					</div>
					<div class="flex flex-col gap-4">
						<h4 class="text-foreground text-base font-medium">Product</h4>
						<div class="flex flex-col gap-4">
							<a href="/components" class="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors">Components</a>
							<a href="/templates" class="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors">Templates</a>
							<a href="/docs" class="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors">Documentation</a>
						</div>
					</div>
					<div class="flex flex-col gap-4">
						<h4 class="text-foreground text-base font-medium">Solutions</h4>
						<div class="flex flex-col gap-4">
							<a href="/dashboard-01-view" class="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors">Dashboards</a>
							<a href="/auth-demo" class="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors">Auth Flows</a>
							<a href="/components/cards" class="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors">Commerce Cards</a>
						</div>
					</div>
					<div class="flex flex-col gap-4">
						<h4 class="text-foreground text-base font-medium">Resources</h4>
						<div class="flex flex-col gap-4">
							<a href="/docs" class="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors">Guides</a>
							<a href="/auth-editor" class="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors">Playground</a>
							<a href="/changelog" class="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors">Changelog</a>
						</div>
					</div>
					<div class="flex flex-col gap-4">
						<h4 class="text-foreground text-base font-medium">Company</h4>
						<div class="flex flex-col gap-4">
							<a href="/about" class="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors">About</a>
							<a href="/roadmap" class="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors">Roadmap</a>
							<a href="/contact" class="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors">Contact</a>
						</div>
					</div>
				</div>
				<div class="border-muted-foreground/20 mt-16 flex flex-col items-center justify-between gap-6 border-t pt-8 md:flex-row">
					<div class="flex flex-wrap gap-4 text-sm">
						<a href="/terms" class="text-muted-foreground hover:text-foreground transition-colors">Terms &amp; Conditions</a>
						<a href="/privacy" class="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
					</div>
					<div class="flex gap-4">
						<a href="https://github.com/" class="bg-muted/50 text-muted-foreground hover:text-primary rounded-full p-2 transition-colors" aria-label="GitHub">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
								<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3.28-.36 6.73-1.6 6.73-7.2A5.6 5.6 0 0 0 19.5 3.77 5.07 5.07 0 0 0 19.41 1S18.73.65 15 3.13a13.38 13.38 0 0 0-6 0C5.27.65 4.59 1 4.59 1A5.07 5.07 0 0 0 4.5 3.77 5.6 5.6 0 0 0 3.27 7.6c0 5.56 3.45 6.84 6.73 7.2a4.8 4.8 0 0 0-1 3.2v4" />
								<path d="M9 18c-4.51 2-5-2-7-2" />
							</svg>
						</a>
						<a href="https://x.com/" class="bg-muted/50 text-muted-foreground hover:text-primary rounded-full p-2 transition-colors" aria-label="X">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
								<path d="M4 4l16 16" />
								<path d="M20 4 4 20" />
							</svg>
						</a>
						<a href="https://instagram.com/" class="bg-muted/50 text-muted-foreground hover:text-primary rounded-full p-2 transition-colors" aria-label="Instagram">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
								<rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
								<path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
								<line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
							</svg>
						</a>
					</div>
				</div>
			</div>
		</footer>
	</div>
</div>
