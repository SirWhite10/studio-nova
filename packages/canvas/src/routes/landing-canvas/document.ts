import type { CanvasDocument } from "$lib/index.js";

export const landingCanvasDocument: CanvasDocument = {
  components: [
    {
      id: "landing-canvas-page-root",
      type: "View",
      kind: "primitive",
      props: {
        class: "flex w-full flex-col",
      },
      children: [
        {
          id: "landing-canvas-hero-section",
          type: "View",
          kind: "primitive",
          props: {
            class: "mx-auto flex w-full max-w-7xl flex-col px-6 py-6 md:px-10 md:py-8",
          },
          children: [
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
                        class:
                          "bg-primary/8 text-primary inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-sm",
                      },
                      children: [
                        {
                          id: "landing-canvas-eyebrow-dot",
                          type: "View",
                          kind: "primitive",
                          props: {
                            class:
                              "bg-primary size-2 rounded-full shadow-[0_0_18px_hsl(var(--primary)/0.65)]",
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
                            style:
                              "font: inherit; color: inherit; line-height: inherit; letter-spacing: inherit;",
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
                        size: {
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
                        },
                        weight: "bold",
                        letterSpacing: "tight",
                        class: "text-balance",
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
                        size: {
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
                        },
                        class: "text-muted-foreground max-w-2xl text-balance",
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
                        class: "h-10 px-8 py-2",
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
                            style:
                              "font: inherit; color: inherit; line-height: inherit; letter-spacing: inherit;",
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
                        class: "h-10 px-8 py-2",
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
                            style:
                              "font: inherit; color: inherit; line-height: inherit; letter-spacing: inherit;",
                          },
                        },
                      ],
                    },
                  ],
                },
                media: {
                  children: [
                    {
                      id: "landing-canvas-media-frame",
                      type: "View",
                      kind: "primitive",
                      props: {
                        class: "relative aspect-[16/9] size-full overflow-hidden",
                      },
                      children: [
                        {
                          id: "landing-canvas-media-image",
                          type: "Image",
                          kind: "primitive",
                          props: {
                            src: "https://assets.shadcnstore.com/shadcnstore.com/stock/marketing/fashion-template-preview.500w.76ef52.avif",
                            alt: "Canvas component preview",
                            class:
                              "size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]",
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
                            class:
                              "from-background/50 via-background/10 absolute inset-0 bg-gradient-to-t to-transparent",
                          },
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
                        class:
                          "absolute inset-x-4 bottom-4 z-10 rounded-xl border border-white/20 bg-black/30 p-4 backdrop-blur-sm",
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
                            class: "text-sm text-white/80",
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
        },
      ],
    },
  ],
};
