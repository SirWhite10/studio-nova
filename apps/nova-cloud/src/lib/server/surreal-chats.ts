import { StringRecordId, Table } from "surrealdb";
import { getSurreal } from "./surreal";
import {
  ensureRecordPrefix,
  normalizeRouteParam,
  queryRows,
  withRecordIds,
} from "./surreal-records";

export type ChatRow = {
  id: unknown;
  userId: string;
  studioId?: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
};

export type MessageRow = {
  id: unknown;
  chatId: string;
  userId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  parts?: any[] | null;
  createdAt: number;
  metadata?: Record<string, unknown>;
};

export async function createChat(
  userId: string,
  studioId: string | null = null,
  title = "New chat",
) {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS chat SCHEMALESS").collect();
  await db.query("DEFINE TABLE IF NOT EXISTS chat_message SCHEMALESS").collect();

  const fullStudioId = studioId ? ensureRecordPrefix("studio", studioId) : null;

  const created = await db.create(new Table("chat")).content({
    userId,
    studioId: fullStudioId,
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const row = Array.isArray(created) ? created[0] : created;
  return withRecordIds(row as ChatRow);
}

export async function listChatsForUser(userId: string, studioId?: string) {
  const db = await getSurreal();
  const fullStudioId = studioId ? ensureRecordPrefix("studio", studioId) : undefined;
  const q = fullStudioId
    ? "SELECT * FROM chat WHERE userId = $userId AND studioId = $studioId ORDER BY updatedAt DESC"
    : "SELECT * FROM chat WHERE userId = $userId ORDER BY updatedAt DESC";

  try {
    const rows = await queryRows<ChatRow>(
      db,
      q,
      fullStudioId ? { userId, studioId: fullStudioId } : { userId },
    );
    return rows.map(withRecordIds);
  } catch {
    return [];
  }
}

export async function getChat(chatId: string) {
  const db = await getSurreal();
  const fullId = ensureRecordPrefix("chat", normalizeRouteParam(chatId));
  const selected = await db.select<ChatRow>(new StringRecordId(fullId));
  const chat = Array.isArray(selected) ? selected[0] : selected;
  return chat ? withRecordIds(chat) : null;
}

export async function updateChat(chatId: string, updates: Partial<ChatRow>) {
  const db = await getSurreal();
  const fullId = ensureRecordPrefix("chat", normalizeRouteParam(chatId));
  const res = await db.update<ChatRow>(new StringRecordId(fullId)).merge({
    ...updates,
    updatedAt: Date.now(),
  });
  return withRecordIds((Array.isArray(res) ? res[0] : res) as ChatRow);
}

export async function deleteChat(chatId: string) {
  const db = await getSurreal();
  const fullId = ensureRecordPrefix("chat", normalizeRouteParam(chatId));
  await db.delete(new StringRecordId(fullId));
  await db.query("DELETE FROM chat_message WHERE chatId = $chatId", { chatId: fullId });
}

export async function saveMessage(
  chatId: string,
  userId: string,
  role: MessageRow["role"],
  content: string,
  metadata?: Record<string, unknown>,
  parts?: any[] | null,
) {
  const db = await getSurreal();
  const fullChatId = ensureRecordPrefix("chat", normalizeRouteParam(chatId));
  const created = await db.create(new Table("chat_message")).content({
    chatId: fullChatId,
    userId,
    role,
    content,
    parts: parts ?? null,
    createdAt: Date.now(),
    metadata: metadata || null,
  });
  const row = Array.isArray(created) ? created[0] : created;
  return withRecordIds(row as MessageRow);
}

export async function listMessagesForChat(chatId: string, limit = 50) {
  const db = await getSurreal();
  const fullChatId = ensureRecordPrefix("chat", normalizeRouteParam(chatId));

  try {
    const rows = await queryRows<MessageRow>(
      db,
      "SELECT * FROM chat_message WHERE chatId = $chatId ORDER BY createdAt ASC LIMIT $limit",
      { chatId: fullChatId, limit },
    );
    return rows.map(withRecordIds);
  } catch {
    return [];
  }
}
