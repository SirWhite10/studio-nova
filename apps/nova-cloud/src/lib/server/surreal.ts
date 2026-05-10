import { Surreal, type ConnectionStatus } from "surrealdb";
import { surrealConfig } from "./env";

export interface SurrealConfig {
  url: string;
  namespace: string;
  database: string;
  username: string;
  password: string;
  connectTimeoutMs: number;
}

const DEFAULT_CONNECT_TIMEOUT_MS = 5000;

let instance: Surreal | null = null;
let connectPromise: Promise<Surreal> | null = null;

function getEnv(key: string): string {
  const val = surrealConfig[key as keyof typeof surrealConfig];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

function getEnvOrDefault(key: string, fallback: string): string {
  const val = surrealConfig[key as keyof typeof surrealConfig] as string | undefined;
  return val || fallback;
}

export function getSurrealConnectTimeoutMs(): number {
  const raw = getEnvOrDefault("SURREALDB_CONNECT_TIMEOUT_MS", String(DEFAULT_CONNECT_TIMEOUT_MS));
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CONNECT_TIMEOUT_MS;
}

export function getSurrealConfig(): SurrealConfig {
  return {
    url: getEnv("SURREALDB_URL"),
    namespace: getEnvOrDefault("SURREALDB_NAMESPACE", "main"),
    database: getEnvOrDefault("SURREALDB_DATABASE", "main"),
    username: getEnv("SURREALDB_USERNAME"),
    password: getEnv("SURREALDB_PASSWORD"),
    connectTimeoutMs: getSurrealConnectTimeoutMs(),
  };
}

async function connectWithTimeout(db: Surreal, cfg: SurrealConfig): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const connection = (async () => {
    await db.connect(cfg.url, {
      namespace: cfg.namespace,
      database: cfg.database,
      authentication: {
        username: cfg.username,
        password: cfg.password,
      },
    });
    await db.ready;
  })();

  try {
    await Promise.race([
      connection,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`SurrealDB connection timed out after ${cfg.connectTimeoutMs}ms`));
        }, cfg.connectTimeoutMs);
      }),
    ]);
  } catch (error) {
    await db.close().catch(() => {});
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function getSurreal(): Promise<Surreal> {
  if (instance) {
    const status: ConnectionStatus = instance.status;
    if (status === "connected") return instance;

    if (status === "disconnected") {
      instance = null;
      connectPromise = null;
    }
  }

  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const cfg = getSurrealConfig();
    const db = new Surreal();
    await connectWithTimeout(db, cfg);
    instance = db;
    return db;
  })();

  try {
    return await connectPromise;
  } catch (err) {
    connectPromise = null;
    instance = null;
    throw err;
  }
}

export async function closeSurreal(): Promise<void> {
  if (instance) {
    await instance.close();
    instance = null;
    connectPromise = null;
  }
}

export function getSurrealStatus(): ConnectionStatus {
  return (instance?.status ?? "disconnected") as ConnectionStatus;
}
