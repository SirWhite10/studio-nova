import type { CanvasDocument } from "$lib/index.js";

export const authDocument: CanvasDocument = {
  providers: [
    {
      name: "auth",
      type: "auth-demo",
      kind: "provider",
    },
  ],
  components: [
    {
      id: "auth-demo-shell",
      type: "View",
      kind: "primitive",
      props: {
        display: "grid",
        placeItems: "center",
        minHeight: "100dvh",
        padding: 6,
        background: "linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(241,245,249,1) 100%)",
      },
      children: [
        {
          id: "auth-demo-card-shell",
          type: "View",
          kind: "primitive",
          props: {
            width: "100%",
            maxWidth: "24rem",
            maxHeight: "calc(100dvh - 7rem)",
            overflowY: "auto",
            padding: 2,
            placeSelf: "center",
          },
          children: [
            {
              id: "auth-form",
              type: "Auth.Form",
              kind: "block",
              bindings: {
                title: {
                  source: "auth",
                  path: ["title"],
                },
                description: {
                  source: "auth",
                  path: ["description"],
                },
              },
              props: {
                socialProviders: [
                  { id: "google", label: "Continue with Google" },
                  { id: "github", label: "Continue with GitHub" },
                ],
              },
              actions: {
                onsubmit: {
                  source: "auth",
                  action: "submit",
                },
              },
            },
          ],
        },
      ],
    },
  ],
};
