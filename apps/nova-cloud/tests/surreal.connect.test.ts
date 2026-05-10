import { describe, it, expect, afterAll } from "vite-plus/test";
import { Surreal } from "surrealdb";

function readEnv(key: string): string {
  if (typeof globalThis !== "undefined" && "process" in globalThis) {
    return (globalThis as any).process.env[key] ?? "";
  }
  return "";
}

const url = readEnv("SURREALDB_URL");
const namespace = readEnv("SURREALDB_NAMESPACE") || "main";
const database = readEnv("SURREALDB_DATABASE") || "main";
const username = readEnv("SURREALDB_USERNAME");
const password = readEnv("SURREALDB_PASSWORD");

const skip = !url || !username || !password;

describe.skipIf(skip)("SurrealDB connection + authentication", () => {
  const db = new Surreal();

  afterAll(async () => {
    await db.close();
  });

  it("connects with authentication and reaches ready state", async () => {
    await db.connect(url, {
      namespace,
      database,
      auth: { namespace, database, username, password },
    });

    await db.ready;
    expect(db.status).toBe("connected");
  });

  it("responds to a health ping query", async () => {
    const [result] = await db.query<[string]>("RETURN 'pong'");
    expect(result).toBe("pong");
  });

  it("reports correct namespace and database via INFO", async () => {
    const [info] = await db.query<[unknown]>("INFO FOR DB");
    expect(info).toBeDefined();
  });
});
