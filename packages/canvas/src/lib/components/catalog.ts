import type { CanvasComponentCatalog } from "$lib/base/canvas/types.js";
import { Text } from "$lib/base/text/index.js";
import { View } from "$lib/base/view/index.js";
import { authComponentCatalog } from "./auth/catalog.js";
import { blockComponentCatalog } from "../blocks/catalog.js";
import { buttonComponentCatalog } from "./button/catalog.js";
import { cardComponentCatalog } from "./card/catalog.js";
import { formComponentCatalog } from "./form/catalog.js";
import { imageComponentCatalog } from "./image/catalog.js";

export const canvasComponentCatalog = {
  View: {
    type: "View",
    component: View,
    kind: "primitive",
    category: "layout",
    label: "View",
    description: "Low-level layout primitive.",
  },
  Text: {
    type: "Text",
    component: Text,
    kind: "primitive",
    category: "typography",
    label: "Text",
    description: "Low-level text primitive.",
    defaultProps: {
      text: "Text",
    },
    editorConfig: {
      fields: {
        text: {
          type: "text",
          label: "Text",
        },
      },
    },
  },
  ...authComponentCatalog,
  ...blockComponentCatalog,
  ...buttonComponentCatalog,
  ...cardComponentCatalog,
  ...formComponentCatalog,
  ...imageComponentCatalog,
} satisfies CanvasComponentCatalog;
