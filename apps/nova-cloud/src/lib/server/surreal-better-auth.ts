import { betterAuth } from "better-auth";
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
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
        baseURL: process.env.PUBLIC_SITE_URL || process.env.SITE_URL,
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

export async function surrealGetSession(headers: Headers) {
  const auth = await getSurrealAuth();
  return auth.api.getSession({ headers });
}

export async function surrealSignOut(headers: Headers) {
  const auth = await getSurrealAuth();
  return auth.api.signOut({ headers });
}
