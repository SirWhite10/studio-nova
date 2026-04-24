type UserAuthConfigField = {
  key: string;
  value?: string;
  hasValue?: boolean;
};

export type UserAuthPackage = {
  providers: string[];
  providerBadges: string[];
  missingCredentials: string[];
  installCommand: string;
  envVars: string[];
  snippets: {
    framework: "svelte" | "react" | "vue";
    title: string;
    code: string;
  }[];
};

function valueFor(fields: UserAuthConfigField[], key: string) {
  return fields.find((field) => field.key === key)?.value?.trim() ?? "";
}

function hasValue(fields: UserAuthConfigField[], key: string) {
  return !!fields.find((field) => field.key === key)?.hasValue;
}

function parseProviders(raw: string) {
  const providers = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(providers.length > 0 ? providers : ["email", "password"]));
}

function oauthEnvVars(providers: string[]) {
  const vars: string[] = ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"];
  if (providers.includes("google")) {
    vars.push("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");
  }
  if (providers.includes("github")) {
    vars.push("GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET");
  }
  if (providers.includes("facebook")) {
    vars.push("FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET");
  }
  return vars;
}

export function buildUserAuthPackage(fields: UserAuthConfigField[]): UserAuthPackage {
  const appName = valueFor(fields, "appName") || "Your App";
  const appBaseUrl = valueFor(fields, "appBaseUrl") || "https://app.example.com";
  const providers = parseProviders(valueFor(fields, "providers"));
  const missingCredentials: string[] = [];

  if (providers.includes("google")) {
    if (!valueFor(fields, "googleClientId")) missingCredentials.push("Google client ID");
    if (!hasValue(fields, "googleClientSecret")) missingCredentials.push("Google client secret");
  }
  if (providers.includes("github")) {
    if (!valueFor(fields, "githubClientId")) missingCredentials.push("GitHub client ID");
    if (!hasValue(fields, "githubClientSecret")) missingCredentials.push("GitHub client secret");
  }
  if (providers.includes("facebook")) {
    if (!valueFor(fields, "facebookClientId")) missingCredentials.push("Facebook app ID");
    if (!hasValue(fields, "facebookClientSecret")) missingCredentials.push("Facebook app secret");
  }

  const providerBadges = providers.map((provider) =>
    provider === "email" || provider === "password"
      ? "Email + Password"
      : provider.charAt(0).toUpperCase() + provider.slice(1),
  );

  const providerConfigLines = [
    providers.includes("google")
      ? `  google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! },`
      : "",
    providers.includes("github")
      ? `  github: { clientId: process.env.GITHUB_CLIENT_ID!, clientSecret: process.env.GITHUB_CLIENT_SECRET! },`
      : "",
    providers.includes("facebook")
      ? `  facebook: { clientId: process.env.FACEBOOK_CLIENT_ID!, clientSecret: process.env.FACEBOOK_CLIENT_SECRET! },`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const authServerSnippet = `import { betterAuth } from "better-auth";

export const auth = betterAuth({
  appName: "${appName}",
  baseURL: "${appBaseUrl}",
  emailAndPassword: {
    enabled: ${providers.includes("email") || providers.includes("password") ? "true" : "false"},
  },
  socialProviders: {
${providerConfigLines || "    // Add providers as they are configured"}
  },
});`;

  const signInMethods = providers
    .map((provider) =>
      provider === "email" || provider === "password"
        ? `await authClient.signIn.email({ email, password });`
        : `await authClient.signIn.social({ provider: "${provider}" });`,
    )
    .join("\n");

  return {
    providers,
    providerBadges,
    missingCredentials,
    installCommand: "vp add better-auth",
    envVars: oauthEnvVars(providers),
    snippets: [
      {
        framework: "svelte",
        title: "SvelteKit wiring",
        code: `${authServerSnippet}

// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/svelte";
export const authClient = createAuthClient();

// Sign in actions
${signInMethods}`,
      },
      {
        framework: "react",
        title: "React wiring",
        code: `${authServerSnippet}

// auth-client.ts
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();

// Sign in actions
${signInMethods}`,
      },
      {
        framework: "vue",
        title: "Vue wiring",
        code: `${authServerSnippet}

// auth-client.ts
import { createAuthClient } from "better-auth/vue";
export const authClient = createAuthClient();

// Sign in actions
${signInMethods}`,
      },
    ],
  };
}
