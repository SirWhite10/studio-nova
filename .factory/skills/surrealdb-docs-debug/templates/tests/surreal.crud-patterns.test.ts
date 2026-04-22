import { describe, expect, it } from "vite-plus/test";
import { Surreal, Table } from "surrealdb";
import type { RecordId } from "surrealdb";

type ProjectRecord = {
  id: RecordId;
  name: string;
  status: string;
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

describe("surreal.crud-patterns preflight", () => {
  it("uses update(id).merge(...) and delete(id) flow", async () => {
    const db = new Surreal();
    const url = readEnv("SURREALDB_URL") ?? "ws://127.0.0.1:8000";
    const table = new Table("project");

    await db.connect(url, getConnectOptions());

    const created = await db
      .create<ProjectRecord>(table)
      .content({ name: "crud-preflight", status: "new" });
    const createdRow = Array.isArray(created) ? created[0] : created;
    const recordId = createdRow?.id;
    expect(recordId).toBeDefined();

    const updated = await db.update<ProjectRecord>(recordId as RecordId).merge({ status: "done" });
    const updatedRow = Array.isArray(updated) ? updated[0] : updated;
    expect(updatedRow?.status).toBe("done");

    const selected = await db.select<ProjectRecord>(recordId as RecordId);
    const selectedRow = Array.isArray(selected) ? selected[0] : selected;
    expect(selectedRow?.status).toBe("done");

    await db.delete(recordId as RecordId);
    await db.close();
  });
});
