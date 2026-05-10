import { StringRecordId, Table } from "surrealdb";
import { getSurreal } from "./surreal";
import {
  ensureRecordPrefix,
  normalizeRouteParam,
  normalizeSurrealRow,
  normalizeSurrealRows,
  queryRows,
} from "./surreal-records";

export type RunStatus = "queued" | "preparing" | "running" | "completed" | "failed" | "aborted";

export type ChatRunRow = {
  id: unknown;
  userId: string;
  chatId: string;
  studioId?: string | null;
  trigger?: "chat" | "direct" | "schedule" | null;
  triggerSource?: string | null;
  status: RunStatus;
  streamKey: string;
  liveAttachable: boolean;
  model?: string | null;
  error?: string | null;
  startedAt: number;
  endedAt?: number | null;
  createdAt: number;
  updatedAt: number;
};

async function ensureChatRunTable() {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS chat_run SCHEMALESS");
  return db;
}

export async function createChatRun(input: {
  userId: string;
  chatId: string;
  studioId?: string | null;
  model?: string | null;
  streamKey: string;
  status?: RunStatus;
  liveAttachable?: boolean;
  trigger?: "chat" | "direct" | "schedule" | null;
  triggerSource?: string | null;
}) {
  const db = await ensureChatRunTable();
  const now = Date.now();
  const fullChatId = ensureRecordPrefix("chat", normalizeRouteParam(input.chatId));
  const fullStudioId = input.studioId
    ? ensureRecordPrefix("studio", normalizeRouteParam(input.studioId))
    : null;
  const [created] = await db.create(new Table("chat_run")).content({
    userId: input.userId,
    chatId: fullChatId,
    studioId: fullStudioId,
    trigger: input.trigger ?? "chat",
    triggerSource: input.triggerSource ?? null,
    status: input.status ?? "queued",
    streamKey: input.streamKey,
    liveAttachable: input.liveAttachable ?? true,
    model: input.model ?? null,
    error: null,
    startedAt: now,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  return normalizeSurrealRow<ChatRunRow>(created);
}

export async function getChatRunForUser(userId: string, runId: string) {
  const db = await ensureChatRunTable();
  const fullRunId = ensureRecordPrefix("chat_run", normalizeRouteParam(runId));
  const row = await db.select<ChatRunRow>(new StringRecordId(fullRunId));
  if (!row || row.userId !== userId) return null;
  return normalizeSurrealRow<ChatRunRow>(row);
}

export async function getChatRun(runId: string) {
  const db = await ensureChatRunTable();
  const fullRunId = ensureRecordPrefix("chat_run", normalizeRouteParam(runId));
  const row = await db.select<ChatRunRow>(new StringRecordId(fullRunId));
  return row ? normalizeSurrealRow<ChatRunRow>(row) : null;
}

const DEFAULT_STALE_RUN_MS = 5 * 60 * 1000;

export async function getActiveRunForChat(
  userId: string,
  chatId: string,
  staleRunMs = DEFAULT_STALE_RUN_MS,
) {
  const db = await ensureChatRunTable();
  const fullChatId = ensureRecordPrefix("chat", normalizeRouteParam(chatId));
  const rows = await queryRows<ChatRunRow>(
    db,
    "SELECT * FROM chat_run WHERE userId = $userId AND chatId = $chatId AND status IN ['queued','preparing','running'] ORDER BY updatedAt DESC LIMIT 1",
    { userId, chatId: fullChatId },
  );
  const row = rows[0];
  if (!row) return null;

  const typedRow = normalizeSurrealRow<ChatRunRow>(row);
  if (Date.now() - typedRow.startedAt > staleRunMs) {
    await updateChatRunStatus(typedRow._id, "failed", {
      error: `Run timed out after ${Math.floor(staleRunMs / 60000)} minutes of inactivity`,
      endedAt: Date.now(),
    });
    return null;
  }

  return typedRow;
}

export async function listActiveRunsForStudio(userId: string, studioId: string) {
  const db = await ensureChatRunTable();
  const fullStudioId = ensureRecordPrefix("studio", normalizeRouteParam(studioId));
  const rows = await queryRows<ChatRunRow>(
    db,
    "SELECT * FROM chat_run WHERE userId = $userId AND studioId = $studioId AND status IN ['queued','preparing','running'] ORDER BY updatedAt DESC",
    { userId, studioId: fullStudioId },
  );
  return normalizeSurrealRows<ChatRunRow>(rows);
}

export async function listRunsForChat(userId: string, chatId: string, limit = 20) {
  const db = await ensureChatRunTable();
  const fullChatId = ensureRecordPrefix("chat", normalizeRouteParam(chatId));
  const rows = await queryRows<ChatRunRow>(
    db,
    "SELECT * FROM chat_run WHERE userId = $userId AND chatId = $chatId ORDER BY createdAt DESC LIMIT $limit",
    { userId, chatId: fullChatId, limit },
  );
  return normalizeSurrealRows<ChatRunRow>(rows);
}

export async function listRunsForStudio(userId: string, studioId: string, limit = 20) {
  const db = await ensureChatRunTable();
  const fullStudioId = ensureRecordPrefix("studio", normalizeRouteParam(studioId));
  const rows = await queryRows<ChatRunRow>(
    db,
    "SELECT * FROM chat_run WHERE userId = $userId AND studioId = $studioId ORDER BY createdAt DESC LIMIT $limit",
    { userId, studioId: fullStudioId, limit },
  );
  return normalizeSurrealRows<ChatRunRow>(rows);
}

export async function updateChatRunStatus(
  runId: string,
  status: RunStatus,
  options?: {
    liveAttachable?: boolean;
    error?: string | null;
    endedAt?: number | null;
  },
) {
  const db = await ensureChatRunTable();
  const updatePayload: Record<string, unknown> = {
    status,
    updatedAt: Date.now(),
  };

  if (options && "liveAttachable" in options) {
    updatePayload.liveAttachable = options.liveAttachable;
  }
  if (options && "error" in options) {
    updatePayload.error = options.error ?? null;
  }
  if (options && "endedAt" in options) {
    updatePayload.endedAt = options.endedAt;
  } else if (status === "completed" || status === "failed" || status === "aborted") {
    updatePayload.endedAt = Date.now();
    updatePayload.liveAttachable = false;
  }

  const fullRunId = ensureRecordPrefix("chat_run", runId);
  const updated = await db.update(new StringRecordId(fullRunId)).merge(updatePayload);
  return normalizeSurrealRow<ChatRunRow>(updated);
}
