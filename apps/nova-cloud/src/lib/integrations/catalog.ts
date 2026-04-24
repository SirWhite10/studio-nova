export type IntegrationCapabilityKey = "user-auth" | "github" | "stripe" | "notion" | "email";

export type IntegrationCapabilityDefinition = {
  key: IntegrationCapabilityKey;
  title: string;
  icon: string;
  category: "code" | "commerce" | "knowledge" | "communication";
  defaultEnabled: boolean;
  statusLabel: "Enabled" | "Available";
  docsUrl: string;
  summary: string;
  bullets: string[];
  nextSteps: string[];
  configFields: {
    key: string;
    label: string;
    type: "text" | "password" | "url";
    placeholder?: string;
    helpText?: string;
    secret?: boolean;
    required?: boolean;
    requiredWhenProviders?: string[];
  }[];
};

export const INTEGRATION_CAPABILITIES: IntegrationCapabilityDefinition[] = [
  {
    key: "user-auth",
    title: "User Auth",
    icon: "shield",
    category: "communication",
    defaultEnabled: false,
    statusLabel: "Available",
    docsUrl: "https://www.better-auth.com/docs",
    summary:
      "A packaged authentication capability for client apps with email/password and optional OAuth providers.",
    bullets: [
      "Enable one Studio capability instead of wiring auth providers by hand",
      "Store provider credentials and app settings in one Studio-scoped configuration surface",
      "Generate install and UI guidance for supported frontend frameworks from the saved config",
    ],
    nextSteps: [
      "Choose which auth providers are enabled for this Studio and save their credentials.",
      "Use the generated Svelte, React, or Vue install guide in the client app this Studio produces.",
      "Extend the packaged capability with hosted auth actions and user billing once the pattern is proven.",
    ],
    configFields: [
      {
        key: "appName",
        label: "Auth app name",
        type: "text",
        placeholder: "Acme Portal",
        helpText: "Used in generated auth UI copy and setup guidance.",
        required: true,
      },
      {
        key: "appBaseUrl",
        label: "App base URL",
        type: "url",
        placeholder: "https://app.example.com",
        helpText: "Primary URL where the generated auth UI will live.",
        required: true,
      },
      {
        key: "providers",
        label: "Enabled providers",
        type: "text",
        placeholder: "email,password,google,github",
        helpText:
          "Comma-separated providers. Start with email and password, then add google, github, or facebook.",
        required: true,
      },
      {
        key: "googleClientId",
        label: "Google client ID",
        type: "text",
        placeholder: "google-client-id",
        helpText: "Optional. Needed when Google sign-in is enabled.",
        requiredWhenProviders: ["google"],
      },
      {
        key: "googleClientSecret",
        label: "Google client secret",
        type: "password",
        secret: true,
        placeholder: "google-client-secret",
        helpText: "Stored encrypted and used for Google OAuth flows.",
        requiredWhenProviders: ["google"],
      },
      {
        key: "githubClientId",
        label: "GitHub client ID",
        type: "text",
        placeholder: "github-client-id",
        helpText: "Optional. Needed when GitHub sign-in is enabled.",
        requiredWhenProviders: ["github"],
      },
      {
        key: "githubClientSecret",
        label: "GitHub client secret",
        type: "password",
        secret: true,
        placeholder: "github-client-secret",
        helpText: "Stored encrypted and used for GitHub OAuth flows.",
        requiredWhenProviders: ["github"],
      },
      {
        key: "facebookClientId",
        label: "Facebook app ID",
        type: "text",
        placeholder: "facebook-app-id",
        helpText: "Optional. Needed when Facebook sign-in is enabled.",
        requiredWhenProviders: ["facebook"],
      },
      {
        key: "facebookClientSecret",
        label: "Facebook app secret",
        type: "password",
        secret: true,
        placeholder: "facebook-app-secret",
        helpText: "Stored encrypted and used for Facebook OAuth flows.",
        requiredWhenProviders: ["facebook"],
      },
    ],
  },
  {
    key: "github",
    title: "GitHub",
    icon: "github",
    category: "code",
    defaultEnabled: true,
    statusLabel: "Enabled",
    docsUrl: "https://docs.github.com",
    summary: "Repositories, pull requests, and source-connected work for this Studio.",
    bullets: [
      "Provide Studio-specific repo context and quick navigation",
      "Show connected repos, recent PRs, and branch-aware tooling next",
      "Keep code execution and repo actions grounded in the selected Studio",
    ],
    nextSteps: [
      "Connection health, repo selection, and Studio-scoped auth state.",
      "Quick GitHub actions like opening repos, issues, and pull requests for this Studio.",
      "Recent activity, branch context, and agent-safe repo actions.",
    ],
    configFields: [
      {
        key: "repository",
        label: "Default repository",
        type: "text",
        placeholder: "owner/repo",
        helpText: "Used as the primary repo context for this Studio.",
      },
      {
        key: "personalAccessToken",
        label: "Personal access token",
        type: "password",
        secret: true,
        placeholder: "ghp_...",
        helpText: "Stored encrypted and used for repo, issue, and pull request actions.",
        required: true,
      },
    ],
  },
  {
    key: "stripe",
    title: "Stripe",
    icon: "credit-card",
    category: "commerce",
    defaultEnabled: false,
    statusLabel: "Available",
    docsUrl: "https://docs.stripe.com",
    summary: "Payments, subscriptions, and revenue context for this Studio.",
    bullets: [
      "Appear in the sidebar only for Studios that have Stripe enabled",
      "Use this surface for account linking, sync state, and billing-related tasks",
      "Keep Stripe actions scoped to the selected Studio instead of global app state",
    ],
    nextSteps: [
      "Provider auth, account health, and environment selection for this Studio.",
      "Quick actions for products, subscriptions, customers, and payment links.",
      "Recent billing activity and contextual automation shortcuts.",
    ],
    configFields: [
      {
        key: "publishableKey",
        label: "Publishable key",
        type: "text",
        placeholder: "pk_live_...",
        helpText: "Used for frontend checkout and customer billing flows.",
        required: true,
      },
      {
        key: "secretKey",
        label: "Secret key",
        type: "password",
        secret: true,
        placeholder: "sk_live_...",
        helpText: "Stored encrypted and used for server-side Stripe actions.",
        required: true,
      },
      {
        key: "webhookSecret",
        label: "Webhook secret",
        type: "password",
        secret: true,
        placeholder: "whsec_...",
        helpText: "Optional. Used when Nova provisions webhook handlers for this Studio.",
      },
    ],
  },
  {
    key: "notion",
    title: "Notion",
    icon: "notebook-text",
    category: "knowledge",
    defaultEnabled: false,
    statusLabel: "Available",
    docsUrl: "https://developers.notion.com",
    summary: "Knowledge, docs, and workspace pages mapped into this Studio.",
    bullets: [
      "Use this area for connected databases, pages, and sync status",
      "Keep Notion content contextual to the Studio instead of the whole user account",
      "Surface recent docs and action shortcuts here once connected",
    ],
    nextSteps: [
      "Connection health and workspace/database mapping.",
      "Quick actions for pages, databases, and Studio knowledge sync.",
      "Recent content activity and shortcuts for agent-driven documentation tasks.",
    ],
    configFields: [
      {
        key: "workspaceName",
        label: "Workspace label",
        type: "text",
        placeholder: "Marketing Workspace",
        helpText: "Helpful label shown when multiple Notion workspaces are connected later.",
      },
      {
        key: "apiToken",
        label: "Internal integration token",
        type: "password",
        secret: true,
        placeholder: "secret_...",
        helpText: "Stored encrypted and used to access Notion databases and pages.",
        required: true,
      },
      {
        key: "databaseId",
        label: "Primary database id",
        type: "text",
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        helpText: "Optional. Used as the default Notion database for this Studio.",
      },
    ],
  },
  {
    key: "email",
    title: "Email",
    icon: "mail",
    category: "communication",
    defaultEnabled: false,
    statusLabel: "Available",
    docsUrl: "https://resend.com/docs",
    summary: "Messages, drafting workflows, and automations for this Studio.",
    bullets: [
      "Use this page for mailbox connection, sending rules, and drafting actions",
      "Keep email workflows scoped to the Studio that needs them",
      "Combine with runtime and chat flows for automation-heavy Studios later",
    ],
    nextSteps: [
      "Provider auth, sender identity, and deliverability health.",
      "Quick actions for sending, drafting, and Studio-specific email automations.",
      "Recent send history and contextual communication shortcuts.",
    ],
    configFields: [
      {
        key: "providerUrl",
        label: "Provider API URL",
        type: "url",
        placeholder: "https://api.resend.com",
        helpText: "Optional override when using a non-default email API endpoint.",
      },
      {
        key: "apiKey",
        label: "API key",
        type: "password",
        secret: true,
        placeholder: "re_...",
        helpText: "Stored encrypted and used for sending mail and automation actions.",
        required: true,
      },
      {
        key: "fromAddress",
        label: "Default sender address",
        type: "text",
        placeholder: "hello@example.com",
        helpText: "Used as the default sender identity for this Studio.",
        required: true,
      },
    ],
  },
];

export function getIntegrationCapability(key: string) {
  return INTEGRATION_CAPABILITIES.find((capability) => capability.key === key) ?? null;
}
