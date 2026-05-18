import type { CanvasComponentCatalog, CanvasNodeKind } from "$lib/base/canvas/types.js";
import Hero1 from "./hero/hero-1.svelte";

const blockKind: CanvasNodeKind = "block";
const allKinds: CanvasNodeKind[] = ["primitive", "component", "block", "widget"];

export const blockComponentCatalog = {
  "Hero.1": {
    type: "Hero.1",
    component: Hero1,
    kind: blockKind,
    category: "hero",
    label: "Hero 1",
    description:
      "Landing-page hero preset with authored content, actions, media, and layout controls.",
    defaultProps: {
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
    editorConfig: {
      fields: {
        eyebrowText: {
          type: "text",
          label: "Eyebrow",
        },
        titleText: {
          type: "text",
          label: "Title",
          multiline: true,
        },
        descriptionText: {
          type: "text",
          label: "Description",
          multiline: true,
        },
        primaryActionLabel: {
          type: "text",
          label: "Primary Action Label",
        },
        primaryActionHref: {
          type: "text",
          label: "Primary Action Link",
        },
        secondaryActionLabel: {
          type: "text",
          label: "Secondary Action Label",
        },
        secondaryActionHref: {
          type: "text",
          label: "Secondary Action Link",
        },
        mediaSrc: {
          type: "text",
          label: "Media URL",
        },
        mediaAlt: {
          type: "text",
          label: "Media Alt",
        },
        overlayTitle: {
          type: "text",
          label: "Overlay Title",
        },
        overlayDescription: {
          type: "text",
          label: "Overlay Description",
          multiline: true,
        },
        class: {
          type: "text",
          label: "Class",
        },
        layout: {
          type: "select",
          label: "Layout",
          options: ["split", "stacked"],
        },
        contentAlignment: {
          type: "select",
          label: "Content Alignment",
          options: ["start", "center"],
        },
        textAlignment: {
          type: "select",
          label: "Text Alignment",
          options: ["left", "center"],
        },
        mediaVisible: {
          type: "boolean",
          label: "Show Media",
        },
        mediaOverlayVisible: {
          type: "boolean",
          label: "Show Media Overlay",
        },
      },
      groups: {
        content: {
          label: "Content",
          fields: ["eyebrowText", "titleText", "descriptionText"],
        },
        actions: {
          label: "Actions",
          fields: [
            "primaryActionLabel",
            "primaryActionHref",
            "secondaryActionLabel",
            "secondaryActionHref",
          ],
        },
        media: {
          label: "Media",
          fields: [
            "mediaVisible",
            "mediaSrc",
            "mediaAlt",
            "mediaOverlayVisible",
            "overlayTitle",
            "overlayDescription",
          ],
        },
        layout: {
          label: "Layout",
          fields: ["layout", "contentAlignment", "textAlignment"],
        },
        advanced: {
          label: "Advanced",
          fields: ["class"],
        },
      },
    },
    slots: {
      eyebrow: {
        label: "Eyebrow",
        allowedKinds: allKinds,
        multiple: true,
      },
      title: {
        label: "Title",
        allowedKinds: allKinds,
        multiple: true,
      },
      description: {
        label: "Description",
        allowedKinds: allKinds,
        multiple: true,
      },
      actions: {
        label: "Actions",
        allowedKinds: allKinds,
        multiple: true,
      },
      media: {
        label: "Media",
        allowedKinds: allKinds,
        multiple: true,
      },
      mediaOverlay: {
        label: "Media Overlay",
        allowedKinds: allKinds,
        multiple: true,
      },
    },
    acceptsCanvasRuntime: true,
  },
} satisfies CanvasComponentCatalog;
