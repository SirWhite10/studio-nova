import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TABLE_DEFINITIONS = [
  "DEFINE TABLE IF NOT EXISTS workspace_proxy SCHEMALESS",
  "DEFINE FIELD IF NOT EXISTS userId ON workspace_proxy TYPE string",
  "DEFINE FIELD IF NOT EXISTS studioId ON workspace_proxy TYPE string",
  "DEFINE FIELD IF NOT EXISTS runtimeId ON workspace_proxy TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS proxyName ON workspace_proxy TYPE string",
  "DEFINE FIELD IF NOT EXISTS proxyType ON workspace_proxy TYPE string",
  "DEFINE FIELD IF NOT EXISTS localIP ON workspace_proxy TYPE string DEFAULT '127.0.0.1'",
  "DEFINE FIELD IF NOT EXISTS localPort ON workspace_proxy TYPE number",
  "DEFINE FIELD IF NOT EXISTS remotePort ON workspace_proxy TYPE option<number>",
  "DEFINE FIELD IF NOT EXISTS frpcClientId ON workspace_proxy TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS enabled ON workspace_proxy TYPE bool DEFAULT true",
  "DEFINE FIELD IF NOT EXISTS createdAt ON workspace_proxy TYPE number",
  "DEFINE FIELD IF NOT EXISTS updatedAt ON workspace_proxy TYPE number",
  "DEFINE INDEX IF NOT EXISTS idx_workspace_proxy_studio ON workspace_proxy FIELDS studioId",
  "DEFINE INDEX IF NOT EXISTS idx_workspace_proxy_name ON workspace_proxy FIELDS proxyName UNIQUE",
  "DEFINE TABLE IF NOT EXISTS proxy_domain SCHEMALESS",
  "DEFINE FIELD IF NOT EXISTS host ON proxy_domain TYPE string",
  "DEFINE FIELD IF NOT EXISTS proxyId ON proxy_domain TYPE string",
  "DEFINE FIELD IF NOT EXISTS kind ON proxy_domain TYPE string",
  "DEFINE FIELD IF NOT EXISTS status ON proxy_domain TYPE string",
  "DEFINE FIELD IF NOT EXISTS verificationToken ON proxy_domain TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS createdAt ON proxy_domain TYPE number",
  "DEFINE FIELD IF NOT EXISTS updatedAt ON proxy_domain TYPE number",
  "DEFINE INDEX IF NOT EXISTS idx_proxy_domain_host ON proxy_domain FIELDS host UNIQUE",
  "DEFINE INDEX IF NOT EXISTS idx_proxy_domain_proxy ON proxy_domain FIELDS proxyId",
  "DEFINE TABLE IF NOT EXISTS frp_client SCHEMALESS",
  "DEFINE FIELD IF NOT EXISTS clientId ON frp_client TYPE string",
  "DEFINE FIELD IF NOT EXISTS clusterId ON frp_client TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS status ON frp_client TYPE string",
  "DEFINE FIELD IF NOT EXISTS lastHeartbeatAt ON frp_client TYPE option<number>",
  "DEFINE FIELD IF NOT EXISTS metadata ON frp_client TYPE option<object>",
  "DEFINE INDEX IF NOT EXISTS idx_frp_client_client ON frp_client FIELDS clientId UNIQUE",
];

type SurrealStatement = {
  status?: string;
  detail?: string;
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
  resolve(process.cwd(), "tools/nova-domain-schema/.env.local"),
]) {
  loadDotEnvFile(path);
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function surrealSQLURL(raw: string) {
  const parsed = new URL(raw.trim());
  if (parsed.protocol === "ws:") parsed.protocol = "http:";
  if (parsed.protocol === "wss:") parsed.protocol = "https:";
  if (parsed.pathname.endsWith("/rpc")) {
    parsed.pathname = parsed.pathname.slice(0, -4) + "/sql";
  } else if (!parsed.pathname.endsWith("/sql")) {
    parsed.pathname = parsed.pathname.replace(/\/?$/, "/sql");
  }
  return parsed.toString();
}

async function main() {
  const sqlURL = surrealSQLURL(requireEnv("SURREALDB_URL"));
  const namespace = process.env.SURREALDB_NAMESPACE || "main";
  const database = process.env.SURREALDB_DATABASE || "main";
  const username = requireEnv("SURREALDB_USERNAME");
  const password = requireEnv("SURREALDB_PASSWORD");

  console.log(`Ensuring Nova FRP schema in ${namespace}/${database} via ${sqlURL}`);

  for (const statement of TABLE_DEFINITIONS) {
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
    if (!response.ok) {
      throw new Error(`Surreal SQL request failed (${response.status}): ${body.trim()}`);
    }

    let parsed: SurrealStatement[] = [];
    try {
      parsed = JSON.parse(body) as SurrealStatement[];
    } catch {
      throw new Error(`Invalid Surreal SQL response: ${body.trim()}`);
    }

    const first = parsed[0];
    if (!first || first.status?.toUpperCase() !== "OK") {
      throw new Error(
        first?.detail || first?.status || `Unexpected Surreal SQL response: ${body.trim()}`,
      );
    }
  }

  console.log("Nova FRP schema ensured successfully");
}

await main();
