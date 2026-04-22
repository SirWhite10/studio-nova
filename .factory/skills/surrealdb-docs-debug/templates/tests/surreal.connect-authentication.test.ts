import { describe, expect, it } from "vite-plus/test";
import { Surreal } from "surrealdb";

function readEnv(name: string): string | undefined {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  return runtime.process?.env?.[name];
}

function getConnectOptions() {
  const namespace = readEnv("SURREALDB_NAMESPACE") ?? "test";
  const database = readEnv("SURREALDB_DATABASE") ?? "test";
  const username = readEnv("SURREALDB_USERNAME");
  const password = readEnv("SURREALDB_PASSWORD");

  return {
    namespace,
    database,
    ...(username && password
      ? {
          authentication: { username, password },
        }
      : {}),
  };
}

describe("surreal.connect-authentication preflight", () => {
  it("connects with modern authentication option shape", async () => {
    const db = new Surreal();
    const url = readEnv("SURREALDB_URL") ?? "ws://127.0.0.1:8000";

    await db.connect(url, getConnectOptions());
    await db.ready;
    expect(db.status).toBe("connected");
    await db.close();
  });
});
