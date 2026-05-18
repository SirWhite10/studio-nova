import type { CanvasComponentCatalog, CanvasNodeKind } from "$lib/base/canvas/types.js";
import CardRoot from "./card.svelte";
import CardAction from "./card-action.svelte";
import CardContent from "./card-content.svelte";
import CardDescription from "./card-description.svelte";
import CardFooter from "./card-footer.svelte";
import CardHeader from "./card-header.svelte";
import CardTitle from "./card-title.svelte";
import { cardActionEvents, cardActionTargets, cardSizes, cardVariants } from "./schema.js";

const componentKind: CanvasNodeKind = "component";

export const cardComponentCatalog = {
  "Card.Root": {
    type: "Card.Root",
    component: CardRoot,
    kind: componentKind,
    category: "cards",
    label: "Card",
    description: "Semantic card shell with reference-backed visuals and data-driven tap actions.",
    defaultProps: {
      size: "default",
      variant: "default",
      interactive: false,
      disabled: false,
      actions: [],
    },
    editorConfig: {
      fields: {
        size: {
          type: "select",
          label: "Size",
          options: [...cardSizes],
        },
        variant: {
          type: "select",
          label: "Variant",
          options: [...cardVariants],
        },
        interactive: {
          type: "boolean",
          label: "Interactive",
        },
        disabled: {
          type: "boolean",
          label: "Disabled",
        },
        href: {
          type: "text",
          label: "Fallback URL",
          description: "Used when the card is tapped and no navigate action overrides it.",
        },
        target: {
          type: "select",
          label: "Link Target",
          options: [...cardActionTargets],
        },
        rel: {
          type: "text",
          label: "Rel",
          description: "Optional rel value for external navigation.",
        },
        actions: {
          type: "array",
          label: "Actions",
          itemConfig: {
            type: "object",
            label: "Action",
            fields: {
              event: {
                type: "select",
                label: "Event",
                options: [...cardActionEvents],
                default: "tap",
              },
              type: {
                type: "select",
                label: "Type",
                options: ["navigate", "provider", "emit"],
                default: "navigate",
              },
              url: {
                type: "text",
                label: "URL",
                showIf: (data: Record<string, unknown>) => data?.type === "navigate",
              },
              target: {
                type: "select",
                label: "Target",
                options: [...cardActionTargets],
                showIf: (data: Record<string, unknown>) => data?.type === "navigate",
              },
              rel: {
                type: "text",
                label: "Rel",
                showIf: (data: Record<string, unknown>) => data?.type === "navigate",
              },
              source: {
                type: "text",
                label: "Provider Source",
                showIf: (data: Record<string, unknown>) => data?.type === "provider",
              },
              action: {
                type: "text",
                label: "Provider Action",
                showIf: (data: Record<string, unknown>) => data?.type === "provider",
              },
              name: {
                type: "text",
                label: "Event Name",
                showIf: (data: Record<string, unknown>) => data?.type === "emit",
              },
            },
          },
        },
      },
      groups: {
        appearance: {
          label: "Appearance",
          fields: ["size", "variant"],
        },
        behavior: {
          label: "Behavior",
          fields: ["interactive", "disabled", "href", "target", "rel", "actions"],
        },
      },
    },
    slots: {
      header: {
        label: "Header",
        allowedTypes: ["Card.Header"],
        multiple: true,
      },
      content: {
        label: "Content",
        allowedTypes: ["Card.Content"],
        multiple: true,
      },
      footer: {
        label: "Footer",
        allowedTypes: ["Card.Footer"],
        multiple: true,
      },
    },
    acceptsCanvasRuntime: true,
  },
  "Card.Header": {
    type: "Card.Header",
    component: CardHeader,
    kind: componentKind,
    category: "cards",
    label: "Card Header",
    description: "Header region for titles, descriptions, and actions.",
  },
  "Card.Title": {
    type: "Card.Title",
    component: CardTitle,
    kind: componentKind,
    category: "cards",
    label: "Card Title",
    description: "Primary title text for a card.",
    defaultProps: {
      text: "Card title",
    },
    editorConfig: {
      fields: {
        text: {
          type: "text",
          label: "Title",
        },
      },
    },
  },
  "Card.Description": {
    type: "Card.Description",
    component: CardDescription,
    kind: componentKind,
    category: "cards",
    label: "Card Description",
    description: "Secondary description text for a card.",
    defaultProps: {
      text: "Card description",
    },
    editorConfig: {
      fields: {
        text: {
          type: "text",
          label: "Description",
          multiline: true,
        },
      },
    },
  },
  "Card.Action": {
    type: "Card.Action",
    component: CardAction,
    kind: componentKind,
    category: "cards",
    label: "Card Action",
    description: "Action region aligned to the card header.",
  },
  "Card.Content": {
    type: "Card.Content",
    component: CardContent,
    kind: componentKind,
    category: "cards",
    label: "Card Content",
    description: "Main content region for a card.",
  },
  "Card.Footer": {
    type: "Card.Footer",
    component: CardFooter,
    kind: componentKind,
    category: "cards",
    label: "Card Footer",
    description: "Footer actions and supporting content for a card.",
  },
} satisfies CanvasComponentCatalog;
