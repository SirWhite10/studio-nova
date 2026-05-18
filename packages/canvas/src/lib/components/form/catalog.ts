import type { CanvasComponentCatalog, CanvasNodeKind } from "$lib/base/canvas/types.js";
import FormContent from "./form-content.svelte";
import FormHeader from "./form-header.svelte";
import FormRoot from "./form-root.svelte";

const componentKind: CanvasNodeKind = "block";

export const formComponentCatalog = {
  "Form.Root": {
    type: "Form.Root",
    component: FormRoot,
    kind: componentKind,
    category: "forms",
    label: "Form Shell",
    description: "Slot-based form shell with config-driven submit and cancel actions.",
    defaultProps: {
      submitLabel: "Save changes",
      cancelLabel: "Cancel",
      showCancel: true,
    },
    editorConfig: {
      fields: {
        submitLabel: {
          type: "text",
          label: "Submit Label",
        },
        cancelLabel: {
          type: "text",
          label: "Cancel Label",
        },
        showCancel: {
          type: "boolean",
          label: "Show Cancel",
        },
      },
      groups: {
        actions: {
          label: "Actions",
          fields: ["submitLabel", "cancelLabel", "showCancel"],
        },
      },
    },
    slots: {
      header: {
        label: "Header",
        allowedTypes: ["Form.Header"],
        multiple: true,
      },
      content: {
        label: "Content",
        allowedTypes: ["Form.Content"],
        multiple: true,
      },
    },
    acceptsCanvasRuntime: true,
  },
  "Form.Header": {
    type: "Form.Header",
    component: FormHeader,
    kind: "component",
    category: "forms",
    label: "Form Header",
    description: "Config-driven form heading and supporting copy.",
    defaultProps: {
      title: "Form title",
      description: "Explain what this form is for.",
    },
    editorConfig: {
      fields: {
        title: {
          type: "text",
          label: "Title",
        },
        description: {
          type: "text",
          label: "Description",
          multiline: true,
        },
      },
    },
  },
  "Form.Content": {
    type: "Form.Content",
    component: FormContent,
    kind: "component",
    category: "forms",
    label: "Form Content",
    description: "Content region for fields and helper copy.",
  },
} satisfies CanvasComponentCatalog;
