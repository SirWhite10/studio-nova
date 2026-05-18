import type { CanvasComponentCatalog } from "$lib/base/canvas/types.js";
import { Root as ButtonRoot } from "$lib/shadcn-components/ui/button/index.js";

export const buttonComponentCatalog = {
  "Button.Root": {
    type: "Button.Root",
    component: ButtonRoot,
    kind: "component",
    category: "actions",
    label: "Button",
    description: "Theme-aware action button with variants, sizes, and optional link behavior.",
    defaultProps: {
      variant: "default",
      size: "default",
    },
    editorConfig: {
      fields: {
        variant: {
          type: "select",
          label: "Variant",
          options: ["default", "outline", "secondary", "ghost", "glass", "destructive", "link"],
        },
        size: {
          type: "select",
          label: "Size",
          options: ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"],
        },
        href: {
          type: "text",
          label: "Href",
        },
        class: {
          type: "text",
          label: "Class",
        },
      },
    },
  },
} satisfies CanvasComponentCatalog;
