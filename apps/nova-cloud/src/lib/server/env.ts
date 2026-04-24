import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

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

function getPrivateEnv(key: string, fallback?: string): string | undefined {
  return process.env[key] || fallback;
}

export const surrealConfig = {
  SURREALDB_URL: getPrivateEnv("SURREALDB_URL"),
  SURREALDB_NAMESPACE: getPrivateEnv("SURREALDB_NAMESPACE") || "main",
  SURREALDB_DATABASE: getPrivateEnv("SURREALDB_DATABASE") || "main",
  SURREALDB_USERNAME: getPrivateEnv("SURREALDB_USERNAME"),
  SURREALDB_PASSWORD: getPrivateEnv("SURREALDB_PASSWORD"),
  SURREALDB_CONNECT_TIMEOUT_MS: getPrivateEnv("SURREALDB_CONNECT_TIMEOUT_MS"),
  BETTER_AUTH_SECRET: getPrivateEnv("BETTER_AUTH_SECRET"),
  PUBLIC_SITE_URL: getPrivateEnv("PUBLIC_SITE_URL"),
  NOVA_CRON_SECRET: getPrivateEnv("NOVA_CRON_SECRET"),
};

export const config = {
  ...surrealConfig,
  E2B_API_KEY: getPrivateEnv("E2B_API_KEY"),
  OPENROUTER_API_KEY: getPrivateEnv("OPENROUTER_API_KEY"),
};

export { getPrivateEnv };

export function logEnvStatus() {
  console.log("[ENV] SurrealDB URL present:", !!surrealConfig.SURREALDB_URL);
  console.log("[ENV] SURREALDB_USERNAME present:", !!surrealConfig.SURREALDB_USERNAME);
  console.log("[ENV] BETTER_AUTH_SECRET present:", !!surrealConfig.BETTER_AUTH_SECRET);
  console.log("[ENV] E2B_API_KEY present:", !!config.E2B_API_KEY);
  console.log("[ENV] OPENROUTER_API_KEY present:", !!config.OPENROUTER_API_KEY);
}
