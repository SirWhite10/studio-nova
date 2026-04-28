import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type DomainControlConfig = {
  host: string;
  port: number;
  token: string | null;
  frpToken: string | null;
  subdomainHost: string;
  surreal: {
    url: string;
    namespace: string;
    database: string;
    username: string;
    password: string;
    connectTimeoutMs: number;
  };
};

function loadDotEnvFile(path: string) {
  try {
    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      process.env[key] ??= rawValue.replace(/^["']|["']$/g, "");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

for (const path of [
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), "apps/nova-domain-control/.env.local"),
]) {
  loadDotEnvFile(path);
}

function readInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export function loadConfig(): DomainControlConfig {
  return {
    host: process.env.NOVA_DOMAIN_CONTROL_HOST || "127.0.0.1",
    port: readInt("NOVA_DOMAIN_CONTROL_PORT", 8790),
    token: process.env.NOVA_DOMAIN_CONTROL_TOKEN || null,
    frpToken: process.env.NOVA_DOMAIN_CONTROL_FRP_TOKEN || null,
    subdomainHost: process.env.NOVA_DOMAIN_CONTROL_SUBDOMAIN_HOST || "workspaces.example.com",
    surreal: {
      url: requireEnv("SURREALDB_URL"),
      namespace: process.env.SURREALDB_NAMESPACE || "main",
      database: process.env.SURREALDB_DATABASE || "main",
      username: requireEnv("SURREALDB_USERNAME"),
      password: requireEnv("SURREALDB_PASSWORD"),
      connectTimeoutMs: readInt("SURREALDB_CONNECT_TIMEOUT_MS", 5000),
    },
  };
}
