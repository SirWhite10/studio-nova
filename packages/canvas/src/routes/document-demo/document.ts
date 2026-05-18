import type { CanvasDocument } from "$lib/index.js";

export function createDocumentDemo(): CanvasDocument {
  return {
    providers: [
      {
        name: "workspace",
        type: "state",
        kind: "provider",
        props: {
          title: "Canvas Document Runtime",
          description:
            "Structured nodes, named slots, bindings, and provider-backed actions rendered through Canvas.",
          statusLabel: "Draft mode",
          statusTone: "rgba(245, 158, 11, 0.18)",
          statusBorder: "rgba(245, 158, 11, 0.45)",
          statusText: "#92400e",
          reviewer: "Eddie Lake",
          revisionCount: 3,
          note: "Use the action buttons below to mutate provider state without changing the document tree.",
        },
      },
    ],
    components: [
      {
        id: "document-shell",
        type: "View",
        kind: "primitive",
        props: {
          display: "grid",
          gap: 6,
          padding: 6,
          style: "max-width: 64rem; margin: 0 auto; width: 100%; box-sizing: border-box;",
        },
        children: [
          {
            id: "document-card",
            type: "Card.Root",
            kind: "component",
            slots: {
              header: {
                children: [
                  {
                    id: "document-header",
                    type: "Card.Header",
                    kind: "component",
                    children: [
                      {
                        id: "document-title",
                        type: "Card.Title",
                        kind: "component",
                        bindings: {
                          text: {
                            source: "workspace",
                            path: ["title"],
                          },
                        },
                      },
                      {
                        id: "document-description",
                        type: "Card.Description",
                        kind: "component",
                        bindings: {
                          text: {
                            source: "workspace",
                            path: ["description"],
                          },
                        },
                      },
                      {
                        id: "document-action",
                        type: "Card.Action",
                        kind: "component",
                        children: [
                          {
                            id: "status-chip",
                            type: "View",
                            kind: "primitive",
                            props: {
                              as: "span",
                              paddingLeft: 3,
                              paddingRight: 3,
                              paddingTop: 1,
                              paddingBottom: 1,
                              borderRadius: "9999px",
                              style:
                                "display: inline-flex; align-items: center; font-size: 0.75rem; font-weight: 600;",
                            },
                            bindings: {
                              background: {
                                source: "workspace",
                                path: ["statusTone"],
                              },
                              border: {
                                source: "workspace",
                                path: ["statusBorder"],
                              },
                              color: {
                                source: "workspace",
                                path: ["statusText"],
                              },
                            },
                            children: [
                              {
                                id: "status-chip-text",
                                type: "Text",
                                kind: "primitive",
                                bindings: {
                                  text: {
                                    source: "workspace",
                                    path: ["statusLabel"],
                                  },
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
              content: {
                children: [
                  {
                    id: "document-content",
                    type: "Card.Content",
                    kind: "component",
                    children: [
                      {
                        id: "document-stack",
                        type: "View",
                        kind: "primitive",
                        props: {
                          display: "grid",
                          gap: 4,
                        },
                        children: [
                          {
                            id: "reviewer-line",
                            type: "Text",
                            kind: "primitive",
                            props: {
                              style: "font-size: 0.875rem; color: rgba(15, 23, 42, 0.7);",
                            },
                            bindings: {
                              text: {
                                source: "workspace",
                                path: ["reviewer"],
                              },
                            },
                          },
                          {
                            id: "revision-line",
                            type: "Text",
                            kind: "primitive",
                            props: {
                              style: "font-size: 0.875rem; color: rgba(15, 23, 42, 0.7);",
                            },
                            bindings: {
                              text: {
                                source: "workspace",
                                path: ["note"],
                              },
                            },
                          },
                          {
                            id: "revision-count",
                            type: "Text",
                            kind: "primitive",
                            props: {
                              style: "font-size: 2rem; font-weight: 650; line-height: 1;",
                            },
                            bindings: {
                              text: {
                                source: "workspace",
                                path: ["revisionCount"],
                              },
                            },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              footer: {
                children: [
                  {
                    id: "document-footer",
                    type: "Card.Footer",
                    kind: "component",
                    props: {
                      style: "gap: 0.75rem; align-items: center; justify-content: flex-start;",
                    },
                    children: [
                      {
                        id: "toggle-status-button",
                        type: "View",
                        kind: "primitive",
                        props: {
                          as: "button",
                          paddingLeft: 4,
                          paddingRight: 4,
                          paddingTop: 2,
                          paddingBottom: 2,
                          borderRadius: "0.75rem",
                          border: "1px solid rgba(15, 23, 42, 0.12)",
                          background: "#111827",
                          color: "#ffffff",
                          style:
                            "display: inline-flex; align-items: center; justify-content: center; font-size: 0.875rem; font-weight: 600; cursor: pointer;",
                        },
                        actions: {
                          ontap: {
                            source: "workspace",
                            action: "toggle-status",
                          },
                        },
                        children: [
                          {
                            id: "toggle-status-label",
                            type: "Text",
                            kind: "primitive",
                            props: {
                              text: "Toggle status",
                            },
                          },
                        ],
                      },
                      {
                        id: "increment-revision-button",
                        type: "View",
                        kind: "primitive",
                        props: {
                          as: "button",
                          paddingLeft: 4,
                          paddingRight: 4,
                          paddingTop: 2,
                          paddingBottom: 2,
                          borderRadius: "0.75rem",
                          border: "1px solid rgba(15, 23, 42, 0.12)",
                          background: "#ffffff",
                          color: "#111827",
                          style:
                            "display: inline-flex; align-items: center; justify-content: center; font-size: 0.875rem; font-weight: 600; cursor: pointer;",
                        },
                        actions: {
                          ontap: {
                            source: "workspace",
                            action: "increment-revisions",
                          },
                        },
                        children: [
                          {
                            id: "increment-revision-label",
                            type: "Text",
                            kind: "primitive",
                            props: {
                              text: "Add revision",
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
}
