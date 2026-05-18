import type { CanvasComponentCatalog, CanvasNodeKind } from "$lib/base/canvas/types.js";
import AuthForm from "./auth-form.svelte";

const componentKind: CanvasNodeKind = "block";

export const authComponentCatalog = {
  "Auth.Form": {
    type: "Auth.Form",
    component: AuthForm,
    kind: componentKind,
    category: "auth",
    label: "Auth Form",
    description: "Config-driven login form with provider buttons defined through fields.",
    defaultProps: {
      title: "Login to your account",
      description: "Enter your email below to login to your account",
      submitLabel: "Login",
      secondaryLabel: "Login with Google",
      socialProviders: [
        { id: "google", label: "Continue with Google" },
        { id: "github", label: "Continue with GitHub" },
      ],
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
        emailLabel: {
          type: "text",
          label: "Email Label",
        },
        emailPlaceholder: {
          type: "text",
          label: "Email Placeholder",
        },
        passwordLabel: {
          type: "text",
          label: "Password Label",
        },
        forgotPasswordLabel: {
          type: "text",
          label: "Forgot Password Label",
        },
        submitLabel: {
          type: "text",
          label: "Submit Label",
        },
        secondaryLabel: {
          type: "text",
          label: "Fallback Secondary Label",
        },
        socialProviders: {
          type: "array",
          label: "Social Providers",
          itemConfig: {
            type: "object",
            label: "Provider",
            fields: {
              id: {
                type: "text",
                label: "Provider ID",
              },
              label: {
                type: "text",
                label: "Label",
              },
            },
          },
        },
      },
      groups: {
        content: {
          label: "Content",
          fields: [
            "title",
            "description",
            "emailLabel",
            "emailPlaceholder",
            "passwordLabel",
            "forgotPasswordLabel",
          ],
        },
        actions: {
          label: "Actions",
          fields: ["submitLabel", "secondaryLabel", "socialProviders"],
        },
      },
    },
  },
} satisfies CanvasComponentCatalog;
