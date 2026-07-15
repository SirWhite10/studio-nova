import type { DatabaseConfig } from "./config.ts";

interface SurrealStatementResponse {
  status: "OK" | "ERR";
  time?: string;
  result?: unknown;
  detail?: string;
}

function errorDetail(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? "unknown";
  } catch {
    return "unknown";
  }
}

function authorization(config: DatabaseConfig): string | undefined {
  if (!config.username || !config.password) return undefined;
  return `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`;
}

function requestHeaders(config: DatabaseConfig, accept = "application/json"): Headers {
  const headers = new Headers({
    Accept: accept,
    "Surreal-NS": config.namespace,
    "Surreal-DB": config.database,
  });
  const auth = authorization(config);
  if (auth) headers.set("Authorization", auth);
  return headers;
}

async function checkedFetch(
  config: DatabaseConfig,
  path: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.httpUrl}${path}`, {
      ...init,
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(
        `SurrealDB ${path} returned ${response.status}${detail ? `: ${detail}` : ""}`,
      );
    }
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`SurrealDB ${path} timed out after ${config.timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function querySurreal(
  config: DatabaseConfig,
  sql: string,
): Promise<SurrealStatementResponse[]> {
  const headers = requestHeaders(config);
  headers.set("Content-Type", "text/plain");

  const response = await checkedFetch(config, "/sql", {
    method: "POST",
    headers,
    body: sql,
  });
  const body = (await response.json()) as unknown;
  if (!Array.isArray(body)) throw new Error("SurrealDB /sql returned a non-array response");

  const statements = body as SurrealStatementResponse[];
  const failed = statements.find((statement) => statement.status !== "OK");
  if (failed) {
    throw new Error(`SurrealDB query failed: ${failed.detail ?? errorDetail(failed.result)}`);
  }
  return statements;
}

export async function queryResult<T>(config: DatabaseConfig, sql: string): Promise<T> {
  const statements = await querySurreal(config, sql);
  if (statements.length !== 1) {
    throw new Error(`Expected one SurrealDB statement result, received ${statements.length}`);
  }
  return statements[0]?.result as T;
}

export async function exportSurreal(config: DatabaseConfig): Promise<Uint8Array> {
  const headers = requestHeaders(config, "application/octet-stream");
  headers.set("Content-Type", "application/json");

  const response = await checkedFetch(config, "/export", {
    method: "POST",
    headers,
    body: JSON.stringify({
      users: true,
      accesses: true,
      params: true,
      functions: true,
      analyzers: true,
      versions: false,
      records: true,
    }),
  });
  return new Uint8Array(await response.arrayBuffer());
}
