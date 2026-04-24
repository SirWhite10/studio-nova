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

interface TestMessage {
  id: RecordId;
  chatId: string;
  role: string;
  content: string;
  isComplete: boolean;
  createdAt: string;
}

describe.skipIf(skip)("SurrealDB CRUD patterns (messages-like flow)", () => {
  const db = new Surreal();

  beforeAll(async () => {
    await db.connect(url, {
      namespace,
      database,
      authentication: { username, password },
    });
    await db.ready;
    await db.query("REMOVE TABLE IF EXISTS _test_messages");
  });

  afterAll(async () => {
    await db.query("REMOVE TABLE IF EXISTS _test_messages");
    await db.close();
  });

  let messageId: RecordId;

  it("creates a streaming message (isComplete=false)", async () => {
    const msg = await db.create<TestMessage>(new Table("_test_messages")).content({
      chatId: "chat:test1",
      role: "assistant",
      content: "",
      isComplete: false,
      createdAt: new Date().toISOString(),
    });

    const firstMsg = Array.isArray(msg) ? msg[0] : msg;
    expect(firstMsg.id).toBeDefined();
    expect(firstMsg.isComplete).toBe(false);
    messageId = firstMsg.id;
  });

  it("appends content via update().merge()", async () => {
    const updated = await db.update<TestMessage>(messageId).merge({ content: "Hello, " });

    expect(updated.content).toBe("Hello, ");
    expect((updated as any).isComplete).toBe(false);
  });

  it("finalizes message with full content and isComplete=true", async () => {
    const finalized = await db.update<TestMessage>(messageId).merge({
      content: "Hello, world!",
      isComplete: true,
    });

    expect(finalized.content).toBe("Hello, world!");
    expect(finalized.isComplete).toBe(true);
  });

  it("queries messages by chatId using parameterized query", async () => {
    const results = await db.query<[TestMessage[]]>(
      "SELECT * FROM _test_messages WHERE chatId = $chatId",
      { chatId: "chat:test1" },
    );

    expect(results[0].length).toBe(1);
    expect(results[0][0].content).toBe("Hello, world!");
  });

  it("bulk creates multiple messages", async () => {
    for (let i = 0; i < 3; i++) {
      await db.create<TestMessage>(new Table("_test_messages")).content({
        chatId: "chat:test2",
        role: i === 0 ? "user" : "assistant",
        content: `Message ${i}`,
        isComplete: true,
        createdAt: new Date().toISOString(),
      });
    }

    const results = await db.query<[TestMessage[]]>(
      "SELECT * FROM _test_messages WHERE chatId = $chatId ORDER BY createdAt ASC",
      { chatId: "chat:test2" },
    );

    expect(results[0].length).toBe(3);
  });

  it("deletes all messages for a chat", async () => {
    await db.query("DELETE _test_messages WHERE chatId = $chatId", {
      chatId: "chat:test2",
    });

    const results = await db.query<[TestMessage[]]>(
      "SELECT * FROM _test_messages WHERE chatId = $chatId",
      { chatId: "chat:test2" },
    );

    expect(results[0].length).toBe(0);
  });
});
