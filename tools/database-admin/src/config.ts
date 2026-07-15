import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface DatabaseConfig {
  environment: string;
  httpUrl: string;
  namespace: string;
  database: string;
  username?: string;
  password?: string;
  authLevel: "root" | "namespace" | "database";
  timeoutMs: number;
  repoRoot: string;
}

function parseDotEnv(content: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  return values;
}

export function findRepoRoot(from: string): string {
  let current = resolve(from);

  for (;;) {
    const packagePath = join(current, "package.json");
    if (existsSync(packagePath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as { name?: string };
        if (packageJson.name === "studio-nova") return current;
      } catch {
        // Continue walking; malformed unrelated package files are not the repo root.
      }
    }

    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  throw new Error(`Could not find the studio-nova repository root from ${from}`);
}

function loadEnvironmentFiles(repoRoot: string, environment: string): void {
  const names = [`.env.${environment}.local`, `.env.${environment}`, ".env.local", ".env"];
  const directories = [
    repoRoot,
    join(repoRoot, "tools/database-admin"),
    join(repoRoot, "apps/nova-cloud"),
  ];

  for (const name of names) {
    for (const directory of directories) {
      const path = join(directory, name);
      if (!existsSync(path)) continue;

      const values = parseDotEnv(readFileSync(path, "utf8"));
      for (const [key, value] of Object.entries(values)) {
        process.env[key] ??= value;
      }
    }
  }
}

function normalizeHttpUrl(raw: string): string {
  const withoutRpc = raw
    .trim()
    .replace(/\/+rpc\/?$/, "")
    .replace(/\/+$/, "");
  if (withoutRpc.startsWith("wss://")) return `https://${withoutRpc.slice(6)}`;
  if (withoutRpc.startsWith("ws://")) return `http://${withoutRpc.slice(5)}`;
  if (withoutRpc.startsWith("http://") || withoutRpc.startsWith("https://")) return withoutRpc;
  throw new Error("SURREALDB_HOST/SURREALDB_URL must use http, https, ws, or wss");
}

function positiveInteger(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeAuthLevel(raw: string | undefined): DatabaseConfig["authLevel"] {
  if (!raw || raw === "root") return "root";
  if (raw === "namespace" || raw === "ns") return "namespace";
  if (raw === "database" || raw === "db") return "database";
  throw new Error("SURREALDB_AUTH_LEVEL must be root, namespace/ns, or database/db");
}

export function loadDatabaseConfig(
  options: {
    environment?: string;
    cwd?: string;
    requireCredentials?: boolean;
  } = {},
): DatabaseConfig {
  const environment = options.environment ?? "local";
  const repoRoot = findRepoRoot(options.cwd ?? process.cwd());
  loadEnvironmentFiles(repoRoot, environment);

  const rawUrl = process.env.SURREALDB_HOST ?? process.env.SURREALDB_URL;
  if (!rawUrl) throw new Error("Missing SURREALDB_HOST or SURREALDB_URL");

  const username = process.env.SURREALDB_USER ?? process.env.SURREALDB_USERNAME;
  const password = process.env.SURREALDB_PASSWORD;
  if (options.requireCredentials !== false && (!username || !password)) {
    throw new Error("Missing SURREALDB_USER/SURREALDB_USERNAME or SURREALDB_PASSWORD");
  }

  return {
    environment,
    httpUrl: normalizeHttpUrl(rawUrl),
    namespace: process.env.SURREALDB_NAMESPACE ?? "main",
    database: process.env.SURREALDB_NAME ?? process.env.SURREALDB_DATABASE ?? "main",
    username,
    password,
    authLevel: normalizeAuthLevel(process.env.SURREALDB_AUTH_LEVEL),
    timeoutMs: positiveInteger(process.env.SURREALDB_CONNECT_TIMEOUT_MS, 15_000),
    repoRoot,
  };
}

export function publicConnectionInfo(config: DatabaseConfig): Record<string, unknown> {
  return {
    environment: config.environment,
    url: config.httpUrl,
    namespace: config.namespace,
    database: config.database,
    authLevel: config.authLevel,
    authenticated: Boolean(config.username && config.password),
  };
}
