import type { CanvasDocument } from "$lib/index.js";

export const landingCanvasDocument: CanvasDocument = {
	components: [
		{
			id: "landing-canvas-hero",
			type: "Hero.1",
			kind: "block",
			props: {
				class: "w-full",
			},
			slots: {
				eyebrow: {
					children: [
						{
							id: "landing-canvas-eyebrow-pill",
							type: "View",
							kind: "primitive",
							props: {
								class: "bg-primary/8 text-primary inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-sm",
							},
							children: [
								{
									id: "landing-canvas-eyebrow-dot",
									type: "View",
									kind: "primitive",
									props: {
										class: "bg-primary size-2 rounded-full shadow-[0_0_18px_hsl(var(--primary)/0.65)]",
									},
								},
								{
									id: "landing-canvas-eyebrow-text",
									type: "Text",
									kind: "primitive",
									props: {
										as: "span",
										text: "Data-driven hero block",
										class: "text-sm font-medium tracking-tight",
										style: "font: inherit; color: inherit; line-height: inherit; letter-spacing: inherit;",
									},
								},
							],
						},
					],
				},
				title: {
					children: [
						{
							id: "landing-canvas-title",
							type: "Text",
							kind: "primitive",
							props: {
								as: "h1",
								text: "Build polished product UI with Canvas",
								class: "text-4xl font-bold tracking-tight text-balance md:text-5xl lg:text-6xl",
								style: "margin: 0;",
							},
						},
					],
				},
				description: {
					children: [
						{
							id: "landing-canvas-description",
							type: "Text",
							kind: "primitive",
							props: {
								as: "p",
								text: "Explore reference-backed cards and reusable building blocks for editors, dashboards, and hand-authored app surfaces.",
								class: "text-muted-foreground max-w-2xl text-balance text-base md:text-lg",
								style: "margin: 0;",
							},
						},
					],
				},
				actions: {
					children: [
						{
							id: "landing-canvas-primary-action",
							type: "Button.Root",
							kind: "component",
							props: {
								href: "/components/cards",
								size: "lg",
								class: "h-11 rounded-full px-8 py-2 shadow-lg shadow-primary/20",
							},
							children: [
								{
									id: "landing-canvas-primary-action-text",
									type: "Text",
									kind: "primitive",
									props: {
										as: "span",
										text: "Browse Components",
										size: "sm",
										weight: "medium",
										style: "font: inherit; color: inherit; line-height: inherit; letter-spacing: inherit;",
									},
								},
							],
						},
						{
							id: "landing-canvas-secondary-action",
							type: "Button.Root",
							kind: "component",
							props: {
								href: "/auth-editor",
								variant: "outline",
								size: "lg",
								class: "h-11 rounded-full border-border/70 bg-background/70 px-8 py-2 backdrop-blur-sm",
							},
							children: [
								{
									id: "landing-canvas-secondary-action-text",
									type: "Text",
									kind: "primitive",
									props: {
										as: "span",
										text: "View Documentation",
										size: "sm",
										weight: "medium",
										style: "font: inherit; color: inherit; line-height: inherit; letter-spacing: inherit;",
									},
								},
							],
						},
					],
				},
				media: {
					children: [
						{
							id: "landing-canvas-media-card",
							type: "Card.Root",
							kind: "component",
							props: {
								class: "overflow-hidden border-0 bg-transparent py-0 shadow-none",
							},
							children: [
								{
									id: "landing-canvas-media-content",
									type: "Card.Content",
									kind: "component",
									props: {
										class: "p-0",
									},
									children: [
										{
											id: "landing-canvas-media-frame",
											type: "View",
											kind: "primitive",
											props: {
												class: "relative aspect-[16/10] size-full overflow-hidden rounded-[1.15rem] bg-muted",
											},
											children: [
												{
													id: "landing-canvas-media-image",
													type: "Image",
													kind: "primitive",
													props: {
														src: "https://assets.shadcnstore.com/shadcnstore.com/stock/marketing/fashion-template-preview.500w.76ef52.avif",
														alt: "Canvas component preview",
														class: "size-full object-cover transition-transform duration-700 group-hover:scale-[1.04]",
														style: "display: block;",
														width: 800,
														height: 450,
														loading: "eager",
														decoding: "async",
													},
												},
												{
													id: "landing-canvas-media-gradient",
													type: "View",
													kind: "primitive",
													props: {
														class: "absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.12)_45%,rgba(15,23,42,0.78)_100%)]",
													},
												},
											],
										},
									],
								},
							],
						},
					],
				},
				mediaOverlay: {
					children: [
						{
							id: "landing-canvas-media-overlay-card",
							type: "View",
							kind: "primitive",
							props: {
								class: "absolute inset-x-4 bottom-4 z-10 rounded-2xl border border-white/15 bg-black/45 p-4 shadow-xl backdrop-blur-md",
							},
							children: [
								{
									id: "landing-canvas-media-overlay-title",
									type: "Text",
									kind: "primitive",
									props: {
										as: "p",
										text: "Canvas preview",
										class: "text-sm font-medium text-white",
										style: "margin: 0;",
									},
								},
								{
									id: "landing-canvas-media-overlay-description",
									type: "Text",
									kind: "primitive",
									props: {
										as: "p",
										text: "Reference-backed components for modern app surfaces",
										class: "mt-1 text-sm leading-6 text-white/80",
										style: "margin: 0;",
									},
								},
							],
						},
					],
				},
			},
		},
	],
};
