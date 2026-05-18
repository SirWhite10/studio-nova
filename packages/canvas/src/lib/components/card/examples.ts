import type { CanvasDocument, CanvasProviderActions } from "$lib/base/canvas/types.js";

export const cardShowcaseDocument = {
  providers: [
    {
      name: "showcase",
      type: "demo-data",
      kind: "provider",
      props: {
        social: {
          eyebrow: "Social / creator",
          title: "Creator post card",
          description:
            "Reference-backed visuals with Canvas-owned schema, bindings, and tap actions.",
          statLabel: "Engagement",
          statValue: "311 likes",
        },
        product: {
          eyebrow: "Commerce / fashion",
          title: "Product highlight card",
          description:
            "Semantic card props let the editor change structure and behavior without exposing Tailwind.",
          priceLabel: "Price",
          priceValue: "$148",
        },
        ops: {
          eyebrow: "Operations / inventory",
          title: "Inventory summary card",
          description:
            "Cards can mix data-bound copy, nested layout primitives, and runtime actions.",
          statLabel: "In stock",
          statValue: "1,284 units",
        },
      },
    },
  ],
  components: [
    {
      id: "card-showcase-grid",
      type: "View",
      props: {
        display: "grid",
        gap: 6,
        style: "grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));",
      },
      children: [
        {
          id: "social-card",
          type: "Card.Root",
          props: {
            variant: "interactive",
            interactive: true,
            actions: [
              {
                event: "tap",
                type: "provider",
                source: "demo",
                action: "selectCard",
                payload: {
                  cardId: "social-card",
                  label: "Creator post card",
                },
              },
            ],
          },
          slots: {
            header: {
              children: [
                {
                  id: "social-header",
                  type: "Card.Header",
                  children: [
                    {
                      id: "social-eyebrow",
                      type: "Card.Description",
                      bindings: {
                        text: {
                          source: "showcase",
                          path: ["social", "eyebrow"],
                        },
                      },
                    },
                    {
                      id: "social-title",
                      type: "Card.Title",
                      bindings: {
                        text: {
                          source: "showcase",
                          path: ["social", "title"],
                        },
                      },
                    },
                  ],
                },
              ],
            },
            content: {
              children: [
                {
                  id: "social-content",
                  type: "Card.Content",
                  children: [
                    {
                      id: "social-copy",
                      type: "Text",
                      bindings: {
                        text: {
                          source: "showcase",
                          path: ["social", "description"],
                        },
                      },
                      props: {
                        as: "p",
                        size: "sm",
                        color: "var(--muted-foreground)",
                        lineHeight: "relaxed",
                      },
                    },
                    {
                      id: "social-stat-row",
                      type: "View",
                      props: {
                        display: "flex",
                        justifyContent: "between",
                        alignItems: "center",
                        marginTop: 4,
                        paddingTop: 4,
                        style: "border-top: 1px solid color-mix(in srgb, black 8%, transparent);",
                      },
                      children: [
                        {
                          id: "social-stat-label",
                          type: "Text",
                          bindings: {
                            text: {
                              source: "showcase",
                              path: ["social", "statLabel"],
                            },
                          },
                          props: {
                            size: "sm",
                            color: "var(--muted-foreground)",
                          },
                        },
                        {
                          id: "social-stat-value",
                          type: "Text",
                          bindings: {
                            text: {
                              source: "showcase",
                              path: ["social", "statValue"],
                            },
                          },
                          props: {
                            size: "sm",
                            weight: "medium",
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
        {
          id: "product-card",
          type: "Card.Root",
          props: {
            variant: "elevated",
            href: "#json-cards",
          },
          slots: {
            header: {
              children: [
                {
                  id: "product-header",
                  type: "Card.Header",
                  children: [
                    {
                      id: "product-eyebrow",
                      type: "Card.Description",
                      bindings: {
                        text: {
                          source: "showcase",
                          path: ["product", "eyebrow"],
                        },
                      },
                    },
                    {
                      id: "product-title",
                      type: "Card.Title",
                      bindings: {
                        text: {
                          source: "showcase",
                          path: ["product", "title"],
                        },
                      },
                    },
                  ],
                },
              ],
            },
            content: {
              children: [
                {
                  id: "product-content",
                  type: "Card.Content",
                  children: [
                    {
                      id: "product-copy",
                      type: "Text",
                      bindings: {
                        text: {
                          source: "showcase",
                          path: ["product", "description"],
                        },
                      },
                      props: {
                        as: "p",
                        size: "sm",
                        color: "var(--muted-foreground)",
                        lineHeight: "relaxed",
                      },
                    },
                    {
                      id: "product-price-row",
                      type: "View",
                      props: {
                        display: "flex",
                        justifyContent: "between",
                        alignItems: "center",
                        marginTop: 4,
                        padding: 4,
                        borderRadius: "0.75rem",
                        background: "color-mix(in srgb, white 70%, transparent)",
                        style: "border: 1px solid color-mix(in srgb, black 8%, transparent);",
                      },
                      children: [
                        {
                          id: "product-price-label",
                          type: "Text",
                          bindings: {
                            text: {
                              source: "showcase",
                              path: ["product", "priceLabel"],
                            },
                          },
                          props: {
                            size: "sm",
                            color: "var(--muted-foreground)",
                          },
                        },
                        {
                          id: "product-price-value",
                          type: "Text",
                          bindings: {
                            text: {
                              source: "showcase",
                              path: ["product", "priceValue"],
                            },
                          },
                          props: {
                            size: "lg",
                            weight: "semibold",
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
        {
          id: "ops-card",
          type: "Card.Root",
          props: {
            variant: "outline",
          },
          slots: {
            header: {
              children: [
                {
                  id: "ops-header",
                  type: "Card.Header",
                  children: [
                    {
                      id: "ops-eyebrow",
                      type: "Card.Description",
                      bindings: {
                        text: {
                          source: "showcase",
                          path: ["ops", "eyebrow"],
                        },
                      },
                    },
                    {
                      id: "ops-title",
                      type: "Card.Title",
                      bindings: {
                        text: {
                          source: "showcase",
                          path: ["ops", "title"],
                        },
                      },
                    },
                  ],
                },
              ],
            },
            content: {
              children: [
                {
                  id: "ops-content",
                  type: "Card.Content",
                  children: [
                    {
                      id: "ops-copy",
                      type: "Text",
                      bindings: {
                        text: {
                          source: "showcase",
                          path: ["ops", "description"],
                        },
                      },
                      props: {
                        as: "p",
                        size: "sm",
                        color: "var(--muted-foreground)",
                        lineHeight: "relaxed",
                      },
                    },
                    {
                      id: "ops-stat-box",
                      type: "View",
                      props: {
                        marginTop: 4,
                        padding: 4,
                        borderRadius: "0.75rem",
                        style: "border: 1px solid color-mix(in srgb, black 8%, transparent);",
                      },
                      children: [
                        {
                          id: "ops-stat-label",
                          type: "Text",
                          bindings: {
                            text: {
                              source: "showcase",
                              path: ["ops", "statLabel"],
                            },
                          },
                          props: {
                            as: "p",
                            size: "sm",
                            color: "var(--muted-foreground)",
                          },
                        },
                        {
                          id: "ops-stat-value",
                          type: "Text",
                          bindings: {
                            text: {
                              source: "showcase",
                              path: ["ops", "statValue"],
                            },
                          },
                          props: {
                            as: "p",
                            size: "2xl",
                            weight: "semibold",
                            marginTop: 1,
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
} satisfies CanvasDocument;

export const cardShowcaseJson = JSON.stringify(cardShowcaseDocument, null, 2);

export const cardShowcaseProviderActions = {
  demo: {
    selectCard: (payload) => payload,
  },
} satisfies CanvasProviderActions;
