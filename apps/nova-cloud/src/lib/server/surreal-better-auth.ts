import { betterAuth } from "better-auth";
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Resend } from "resend";
import { surrealAdapter } from "./surrealdb-better-auth-adapter";
import { getSurrealConnectTimeoutMs } from "./surreal";

for (const path of [
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), ".dev.vars"),
  resolve(process.cwd(), "apps/nova-cloud/.env.local"),
  resolve(process.cwd(), "apps/nova-cloud/.dev.vars"),
]) {
  if (existsSync(path)) {
    loadDotenv({ path, override: false });
  }
}

let authPromise: Promise<any> | null = null;
let resend: Resend | null = null;

export function getSiteUrl(): string {
  const explicitSiteUrl = process.env.PUBLIC_SITE_URL || process.env.SITE_URL;
  if (explicitSiteUrl) return explicitSiteUrl;

  return process.env.NODE_ENV === "production"
    ? "https://nova.dlxstudios.com"
    : "https://devnova.dlxstudios.com";
}

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(requireEnv("RESEND_API_KEY"));
  }

  return resend;
}

function buildResetPasswordEmail(url: string) {
  return {
    subject: "Reset your DLX Studios password",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h1 style="font-size: 20px; margin: 0 0 16px;">Reset your password</h1>
        <p style="margin: 0 0 16px;">Use the button below to choose a new password for your DLX Studios account.</p>
        <p style="margin: 0 0 24px;">
          <a href="${url}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px;">
            Reset password
          </a>
        </p>
        <p style="margin: 0 0 8px;">If the button does not work, paste this link into your browser:</p>
        <p style="word-break: break-all; margin: 0;">${url}</p>
      </div>
    `,
    text: `Reset your password: ${url}`,
  };
}

export function getResetPasswordPageUrl(token: string, callbackURL?: string): string {
  const fallbackUrl = new URL("/auth/reset-password", getSiteUrl());
  fallbackUrl.searchParams.set("token", token);

  if (!callbackURL) {
    return fallbackUrl.toString();
  }

  try {
    const resolvedCallbackUrl = new URL(callbackURL, getSiteUrl());
    if (resolvedCallbackUrl.origin !== new URL(getSiteUrl()).origin) {
      return fallbackUrl.toString();
    }

    resolvedCallbackUrl.searchParams.set("token", token);
    return resolvedCallbackUrl.toString();
  } catch {
    return fallbackUrl.toString();
  }
}

function requireEnv(name: string): string {
  const value = typeof process !== "undefined" ? process.env[name] : undefined;
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function getAuthSecret(): string {
  const secret = typeof process !== "undefined" ? process.env.BETTER_AUTH_SECRET : undefined;
  if (secret) return secret;

  if (process.env.NODE_ENV !== "production") {
    return "dev-only-better-auth-secret-change-me";
  }

  throw new Error("Missing env var: BETTER_AUTH_SECRET");
}

export async function getSurrealAuth() {
  if (!authPromise) {
    console.log("[auth] initializing better-auth with surreal adapter");
    authPromise = Promise.resolve(
      betterAuth({
        secret: getAuthSecret(),
        baseURL: getSiteUrl(),
        database: surrealAdapter({
          address: requireEnv("SURREALDB_URL"),
          username: requireEnv("SURREALDB_USERNAME"),
          password: requireEnv("SURREALDB_PASSWORD"),
          ns: process.env.SURREALDB_NAMESPACE || "main",
          db: process.env.SURREALDB_DATABASE || "main",
          connectTimeoutMs: getSurrealConnectTimeoutMs(),
        }),
        emailAndPassword: {
          enabled: true,
          requireEmailVerification: false,
          revokeSessionsOnPasswordReset: true,
          sendResetPassword: async ({ user, token }) => {
            const resetUrl = getResetPasswordPageUrl(token);
            const email = buildResetPasswordEmail(resetUrl);
            await getResend().emails.send({
              from: requireEnv("RESEND_FROM_EMAIL"),
              to: user.email,
              subject: email.subject,
              html: email.html,
              text: email.text,
            });
          },
        },
        session: {
          expiresIn: 60 * 60 * 24 * 30,
        },
      }),
    );
  }
  return authPromise;
}

export async function surrealSignUpEmail(input: {
  email: string;
  password: string;
  name?: string;
  headers?: Headers;
}) {
  const auth = await getSurrealAuth();
  return auth.api.signUpEmail({
    body: {
      email: input.email,
      password: input.password,
      name: input.name || input.email.split("@")[0],
    },
    headers: input.headers,
  });
}

export async function surrealSignInEmail(input: {
  email: string;
  password: string;
  headers?: Headers;
}) {
  const auth = await getSurrealAuth();
  return auth.api.signInEmail({
    body: {
      email: input.email,
      password: input.password,
    },
    headers: input.headers,
  });
}

export async function surrealRequestPasswordReset(input: {
  email: string;
  redirectTo?: string;
  headers?: Headers;
}) {
  const auth = await getSurrealAuth();
  return auth.api.requestPasswordReset({
    body: {
      email: input.email,
      redirectTo: input.redirectTo || `${getSiteUrl()}/auth/reset-password`,
    },
    headers: input.headers,
  });
}

export async function surrealResetPassword(input: {
  token: string;
  newPassword: string;
  headers?: Headers;
}) {
  const auth = await getSurrealAuth();
  return auth.api.resetPassword({
    body: {
      token: input.token,
      newPassword: input.newPassword,
    },
    headers: input.headers,
  });
}

export async function surrealGetSession(headers: Headers) {
  const auth = await getSurrealAuth();
  return auth.api.getSession({ headers });
}

export async function surrealSignOut(headers: Headers) {
  const auth = await getSurrealAuth();
  return auth.api.signOut({ headers });
}
