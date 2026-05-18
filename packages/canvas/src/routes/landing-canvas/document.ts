import type { CanvasDocument } from "$lib/index.js";

export const landingCanvasDocument: CanvasDocument = {
  components: [
    {
      id: "landing-canvas-page-root",
      type: "View",
      kind: "primitive",
      props: {
        class: "flex w-full flex-col px-6 py-6 md:px-10 md:py-8",
      },
      children: [
        {
          id: "landing-canvas-hero",
          type: "Hero.1",
          kind: "block",
          props: {
            class: "w-full",
            layout: "split",
            contentAlignment: "start",
            textAlignment: "left",
            mediaVisible: true,
            mediaOverlayVisible: true,
            eyebrowText: "Data-driven hero block",
            titleText: "Build polished product UI with Canvas",
            descriptionText:
              "Explore reference-backed cards and reusable building blocks for editors, dashboards, and hand-authored app surfaces.",
            primaryActionLabel: "Browse Components",
            primaryActionHref: "/components/cards",
            secondaryActionLabel: "View Documentation",
            secondaryActionHref: "/auth-editor",
            mediaSrc:
              "https://assets.shadcnstore.com/shadcnstore.com/stock/marketing/fashion-template-preview.500w.76ef52.avif",
            mediaAlt: "Canvas component preview",
            overlayTitle: "Canvas preview",
            overlayDescription: "Reference-backed components for modern app surfaces",
          },
        },
      ],
    },
  ],
};
