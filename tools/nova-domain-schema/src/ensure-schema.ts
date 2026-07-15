import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type SurrealStatement = {
  status?: string;
  detail?: string;
  result?: unknown;
};

type DatabaseInfo = {
  tables?: Record<string, string>;
};

type SchemaRelease = {
  key?: string;
  version?: number;
  compatibleServices?: string[];
};

const REQUIRED_TABLES = ["workspace_proxy", "proxy_domain", "frp_client"];

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
  resolve(process.cwd(), "tools/nova-domain-schema/.env.local"),
]) {
  loadDotEnvFile(path);
}

function requireEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Missing env var: ${names.join(" or ")}`);
}

function surrealSQLURL(raw: string) {
  const parsed = new URL(raw.trim());
  if (parsed.protocol === "ws:") parsed.protocol = "http:";
  if (parsed.protocol === "wss:") parsed.protocol = "https:";
  if (parsed.pathname.endsWith("/rpc")) parsed.pathname = parsed.pathname.slice(0, -4);
  parsed.pathname = parsed.pathname.replace(/\/?$/, "/sql");
  return parsed.toString();
}

async function main() {
  const sqlURL = surrealSQLURL(requireEnv("SURREALDB_URL", "SURREALDB_HOST"));
  const namespace = process.env.SURREALDB_NAMESPACE || "main";
  const database = process.env.SURREALDB_DATABASE || process.env.SURREALDB_NAME || "main";
  const username = requireEnv("SURREALDB_USERNAME", "SURREALDB_USER");
  const password = requireEnv("SURREALDB_PASSWORD");

  const query = async <T>(statement: string): Promise<T> => {
    const response = await fetch(sqlURL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "text/plain",
        "Surreal-NS": namespace,
        "Surreal-DB": database,
        Authorization: "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
      },
      body: statement,
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`Surreal SQL request failed (${response.status})`);
    const parsed = JSON.parse(body) as SurrealStatement[];
    const first = parsed[0];
    if (!first || first.status?.toUpperCase() !== "OK") {
      throw new Error(first?.detail || first?.status || "Unexpected Surreal SQL response");
    }
    return first.result as T;
  };

  const info = await query<DatabaseInfo>("INFO FOR DB;");
  const missing = REQUIRED_TABLES.filter((table) => !info.tables?.[table]);
  if (missing.length) {
    throw new Error(
      `Missing domain tables: ${missing.join(", ")}. Apply the repository database rollout first.`,
    );
  }

  let mode = "legacy";
  if (info.tables?.schema_release) {
    const releases = await query<SchemaRelease[]>(
      "SELECT key, version, compatibleServices FROM schema_release ORDER BY version DESC LIMIT 1;",
    );
    const release = releases[0];
    if (!release || !Number.isSafeInteger(release.version) || release.version! < 1) {
      throw new Error("The schema_release marker is missing version 1");
    }
    if (
      release.compatibleServices?.length &&
      !release.compatibleServices.includes("nova-domain-control")
    ) {
      throw new Error(`Schema release ${release.key ?? "unknown"} excludes nova-domain-control`);
    }
    mode = `versioned:${release.version}`;
  }

  console.log(`Nova domain schema verified in ${namespace}/${database} (${mode})`);
}

await main();
