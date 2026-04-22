import { describe, expect, it } from "vite-plus/test";
import { Surreal, Table } from "surrealdb";
import type { RecordId } from "surrealdb";

type ProjectRecord = {
  id: RecordId;
  name: string;
  created_at: Date;
};

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

describe("surreal.create-table preflight", () => {
  it("creates a project record using create().content()", async () => {
    const db = new Surreal();
    const url = readEnv("SURREALDB_URL") ?? "ws://127.0.0.1:8000";
    const table = new Table("project");

    await db.connect(url, getConnectOptions());

    const created = await db
      .create<ProjectRecord>(table)
      .content({ name: "preflight", created_at: new Date() });

    const row = Array.isArray(created) ? created[0] : created;
    expect(row?.name).toBe("preflight");
    await db.close();
  });
});
