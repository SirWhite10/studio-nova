import { describe, it, expect, afterAll, beforeAll } from "vite-plus/test";
import { Surreal, Table } from "surrealdb";
import type { RecordId } from "surrealdb";

function readEnv(key: string): string {
  if (typeof globalThis !== "undefined" && "process" in globalThis) {
    return (globalThis as any).process.env[key] ?? "";
  }
  return "";
}

const url = readEnv("SURREALDB_URL");
const namespace = readEnv("SURREALDB_NAMESPACE") || "test";
const database = readEnv("SURREALDB_DATABASE") || "test";
const username = readEnv("SURREALDB_USERNAME");
const password = readEnv("SURREALDB_PASSWORD");

const skip = !url || !username || !password;

interface TestProject {
  id: RecordId;
  name: string;
  status: string;
  createdAt: string;
}

describe.skipIf(skip)("SurrealDB create table (mandatory gate)", () => {
  const db = new Surreal();

  beforeAll(async () => {
    await db.connect(url, {
      namespace,
      database,
      authentication: { username, password },
    });
    await db.ready;
    // Clean up test table
    await db.query("REMOVE TABLE IF EXISTS _test_projects");
  });

  afterAll(async () => {
    await db.query("REMOVE TABLE IF EXISTS _test_projects");
    await db.close();
  });

  it("creates a record using create().content()", async () => {
    const record = await db.create<TestProject>(new Table("_test_projects")).content({
      name: "Test Project",
      status: "active",
      createdAt: new Date().toISOString(),
    });

    const firstRecord = Array.isArray(record) ? record[0] : record;
    expect(firstRecord).toBeDefined();
    expect(firstRecord.id).toBeDefined();
    expect(firstRecord.name).toBe("Test Project");
    expect(firstRecord.status).toBe("active");
  });

  it("selects all records from the table", async () => {
    const records = await db.select<TestProject>(new Table("_test_projects"));
    expect(records.length).toBeGreaterThanOrEqual(1);
    expect(records[0].name).toBe("Test Project");
  });

  it("updates a record using update().merge()", async () => {
    const records = await db.select<TestProject>(new Table("_test_projects"));
    const first = records[0];

    const updated = await db.update<TestProject>(first.id).merge({ status: "completed" });

    expect(updated).toBeDefined();
    expect(updated.status).toBe("completed");
    expect(updated.name).toBe("Test Project");
  });

  it("deletes a record", async () => {
    const records = await db.select<TestProject>(new Table("_test_projects"));
    const first = records[0];

    await db.delete(first.id);

    const remaining = await db.select<TestProject>(new Table("_test_projects"));
    expect(remaining.length).toBe(0);
  });
});
