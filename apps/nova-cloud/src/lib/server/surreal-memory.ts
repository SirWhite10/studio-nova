import { Table } from "surrealdb";
import { getSurreal } from "./surreal";
import { normalizeSurrealRow, normalizeSurrealRows, queryRows } from "./surreal-records";

type MemoryRow = {
  id: unknown;
  userId: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
};

function memoryScore(row: Pick<MemoryRow, "content" | "metadata">, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const content = row.content.toLowerCase();
  const metadata = JSON.stringify(row.metadata ?? {}).toLowerCase();
  let score = 0;
  if (content.includes(q)) score += 10;
  if (metadata.includes(q)) score += 3;
  for (const token of q.split(/\s+/).filter(Boolean)) {
    if (content.includes(token)) score += 2;
    if (metadata.includes(token)) score += 1;
  }
  return score;
}

export async function addMemoryForUser(
  userId: string,
  content: string,
  metadata?: Record<string, unknown>,
) {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS memory SCHEMALESS");

  const [created] = await db.create(new Table("memory")).content({
    userId,
    content,
    metadata: metadata ?? null,
    createdAt: Date.now(),
  });
  return normalizeSurrealRow<MemoryRow>(created);
}

export async function getMemoriesByUser(userId: string, chatId?: string) {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS memory SCHEMALESS");

  const rows = await queryRows<MemoryRow>(
    db,
    chatId
      ? "SELECT * FROM memory WHERE userId = $userId AND metadata.chatId = $chatId ORDER BY createdAt DESC"
      : "SELECT * FROM memory WHERE userId = $userId ORDER BY createdAt DESC",
    chatId ? { userId, chatId } : { userId },
  );
  return normalizeSurrealRows<MemoryRow>(rows);
}

export async function searchMemoriesForUser(
  userId: string,
  query: string,
  limit = 5,
  threshold = 0.1,
) {
  const rows = await getMemoriesByUser(userId);
  return rows
    .map((entry) => ({
      entry,
      score: memoryScore(entry, query),
    }))
    .filter((result) => result.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
