import type { CanvasDocument } from "$lib/index.js";

export const formDocument: CanvasDocument = {
  providers: [
    {
      name: "form",
      type: "form-demo",
      kind: "provider",
    },
  ],
  components: [
    {
      id: "form-demo-shell",
      type: "View",
      kind: "primitive",
      props: {
        display: "grid",
        minHeight: "100vh",
        placeItems: "center",
        padding: 6,
        background: "linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(241,245,249,1) 100%)",
      },
      children: [
        {
          id: "form-root",
          type: "Form.Root",
          kind: "block",
          props: {
            submitLabel: "Publish",
            cancelLabel: "Discard",
            showCancel: true,
            style: "width: 100%; max-width: 32rem;",
          },
          actions: {
            onsubmit: {
              source: "form",
              action: "submit",
            },
            oncancel: {
              source: "form",
              action: "cancel",
            },
          },
          slots: {
            header: {
              children: [
                {
                  id: "form-header",
                  type: "Form.Header",
                  kind: "component",
                  props: {
                    title: "Create release note",
                    description: "Use slots for structure and fields for the primary actions.",
                  },
                },
              ],
            },
            content: {
              children: [
                {
                  id: "form-content",
                  type: "Form.Content",
                  kind: "component",
                  children: [
                    {
                      id: "form-stack",
                      type: "View",
                      kind: "primitive",
                      props: {
                        display: "grid",
                        gap: 4,
                      },
                      children: [
                        {
                          id: "form-title-field",
                          type: "Text",
                          kind: "primitive",
                          props: {
                            text: "This content region remains slot-driven.",
                            style: "font-weight: 600;",
                          },
                        },
                        {
                          id: "form-caption",
                          type: "Text",
                          kind: "primitive",
                          bindings: {
                            text: {
                              source: "form",
                              path: ["message"],
                            },
                          },
                          props: {
                            style: "opacity: 0.72;",
                          },
                        },
                      ],
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
};
