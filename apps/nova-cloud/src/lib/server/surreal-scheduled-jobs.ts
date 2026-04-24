import { StringRecordId, Table } from "surrealdb";
import {
  nextRunAt,
  normalizeIntervalMinutes,
  normalizeTimeOfDay,
  normalizeWeekday,
  summarizeSchedule,
  type JobScheduleFrequency,
} from "$lib/jobs/schedule";
import { createChat, getChat, updateChat, type ChatRow } from "./surreal-chats";
import { getSurreal } from "./surreal";
import {
  ensureRecordPrefix,
  normalizeRouteParam,
  queryRows,
  withRecordIds,
} from "./surreal-records";
import { createStudioEvent } from "./surreal-studio-events";

export type ScheduledJobStatus = "enabled" | "paused";

export type ScheduledJobRow = {
  id: unknown;
  userId: string;
  studioId: string;
  chatId?: string | null;
  title: string;
  prompt: string;
  frequency: JobScheduleFrequency;
  intervalMinutes?: number | null;
  timeOfDay?: string | null;
  weekday?: number | null;
  summary: string;
  status: ScheduledJobStatus;
  nextRunAt?: number | null;
  lastRunAt?: number | null;
  lastRunId?: string | null;
  lastError?: string | null;
  lockedUntil?: number | null;
  createdAt: number;
  updatedAt: number;
};

type BoundChat = ChatRow & { _id: string; id: string };

const scheduledJobChatLocks = new Map<string, Promise<BoundChat>>();

export type ScheduledJobInput = {
  title?: string | null;
  prompt: string;
  frequency: JobScheduleFrequency;
  intervalMinutes?: number | null;
  timeOfDay?: string | null;
  weekday?: number | null;
  enabled?: boolean;
};

async function ensureScheduledJobTable() {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS scheduled_job SCHEMALESS").collect();
  return db;
}

function scheduledJobChatTitle(title: string) {
  return `Scheduled job: ${title}`;
}

function normalizeJobInput(input: ScheduledJobInput) {
  const frequency = input.frequency ?? "daily";
  const normalized = {
    title: input.title?.trim() || "Untitled job",
    prompt: input.prompt.trim(),
    frequency,
    intervalMinutes:
      frequency === "every_minutes" ? normalizeIntervalMinutes(input.intervalMinutes) : null,
    timeOfDay:
      frequency === "daily" || frequency === "weekly" ? normalizeTimeOfDay(input.timeOfDay) : null,
    weekday: frequency === "weekly" ? normalizeWeekday(input.weekday) : null,
    status: input.enabled === false ? ("paused" as const) : ("enabled" as const),
  };
  return {
    ...normalized,
    summary: summarizeSchedule(normalized),
    nextRunAt: normalized.status === "enabled" ? nextRunAt(normalized) : null,
  };
}

export async function createScheduledJob(
  userId: string,
  studioId: string,
  input: ScheduledJobInput,
) {
  const db = await ensureScheduledJobTable();
  const now = Date.now();
  const normalized = normalizeJobInput(input);
  const chat = await createChat(
    userId,
    normalizeRouteParam(studioId),
    scheduledJobChatTitle(normalized.title),
  );
  const created = await db.create(new Table("scheduled_job")).content({
    userId,
    studioId: ensureRecordPrefix("studio", normalizeRouteParam(studioId)),
    chatId: ensureRecordPrefix("chat", chat._id),
    ...normalized,
    lastRunAt: null,
    lastRunId: null,
    lastError: null,
    lockedUntil: null,
    createdAt: now,
    updatedAt: now,
  });
  const row = Array.isArray(created) ? created[0] : created;
  const job = withRecordIds(row as ScheduledJobRow);
  await createStudioEvent({
    userId,
    studioId,
    kind: "job.updated",
    entityType: "scheduled_job",
    entityId: job._id,
    state: job.status,
    summary: `${job.title} created`,
    payload: {
      summary: job.summary,
      nextRunAt: job.nextRunAt ?? null,
    },
  });
  return job;
}

export async function listScheduledJobsForStudio(userId: string, studioId: string) {
  const db = await ensureScheduledJobTable();
  const rows = await queryRows<ScheduledJobRow>(
    db,
    "SELECT * FROM scheduled_job WHERE userId = $userId AND studioId = $studioId ORDER BY createdAt DESC",
    { userId, studioId: ensureRecordPrefix("studio", normalizeRouteParam(studioId)) },
  );
  return rows.map((row) => withRecordIds(row));
}

export async function listDueScheduledJobs(limit = 10) {
  const db = await ensureScheduledJobTable();
  const now = Date.now();
  const rows = await queryRows<ScheduledJobRow>(
    db,
    "SELECT * FROM scheduled_job WHERE status = 'enabled' AND nextRunAt <= $now AND (lockedUntil = NONE OR lockedUntil < $now) ORDER BY nextRunAt ASC LIMIT $limit",
    { now, limit },
  );
  return rows.map((row) => withRecordIds(row));
}

export async function getScheduledJobForUser(userId: string, jobId: string) {
  const db = await ensureScheduledJobTable();
  const selected = await db.select<ScheduledJobRow>(
    new StringRecordId(ensureRecordPrefix("scheduled_job", normalizeRouteParam(jobId))),
  );
  const row = Array.isArray(selected) ? selected[0] : selected;
  if (!row || row.userId !== userId) return null;
  return withRecordIds(row);
}

export async function updateScheduledJob(userId: string, jobId: string, input: ScheduledJobInput) {
  const db = await ensureScheduledJobTable();
  const current = await getScheduledJobForUser(userId, jobId);
  if (!current) return null;
  const normalized = normalizeJobInput(input);
  const updated = await db
    .update<ScheduledJobRow>(
      new StringRecordId(ensureRecordPrefix("scheduled_job", normalizeRouteParam(jobId))),
    )
    .merge({
      ...normalized,
      updatedAt: Date.now(),
    });
  const row = Array.isArray(updated) ? updated[0] : updated;
  const job = withRecordIds(row as ScheduledJobRow);
  if (job.chatId) {
    await updateChat(job.chatId, {
      title: scheduledJobChatTitle(job.title),
    }).catch(() => {});
  }
  await createStudioEvent({
    userId,
    studioId: job.studioId,
    kind: "job.updated",
    entityType: "scheduled_job",
    entityId: job._id,
    state: job.status,
    summary: `${job.title} updated`,
    payload: {
      summary: job.summary,
      nextRunAt: job.nextRunAt ?? null,
    },
  });
  return job;
}

export async function deleteScheduledJob(userId: string, jobId: string) {
  const db = await ensureScheduledJobTable();
  const current = await getScheduledJobForUser(userId, jobId);
  if (!current) return false;
  await db.delete(
    new StringRecordId(ensureRecordPrefix("scheduled_job", normalizeRouteParam(jobId))),
  );
  await createStudioEvent({
    userId,
    studioId: current.studioId,
    kind: "job.updated",
    entityType: "scheduled_job",
    entityId: current._id,
    state: "deleted",
    summary: `${current.title} deleted`,
    payload: {
      summary: current.summary,
    },
  });
  return true;
}

export async function ensureScheduledJobChat(userId: string, jobId: string): Promise<BoundChat> {
  const normalizedJobId = normalizeRouteParam(jobId);
  const lockKey = `${userId}:${normalizedJobId}`;
  const existingLock = scheduledJobChatLocks.get(lockKey);
  if (existingLock) return existingLock;

  const run = (async () => {
    const job = await getScheduledJobForUser(userId, normalizedJobId);
    if (!job) {
      throw new Error("Scheduled job not found");
    }

    if (job.chatId) {
      const chat = await getChat(job.chatId).catch(() => null);
      if (chat && chat.userId === userId && chat.studioId === job.studioId) {
        if (chat.title !== scheduledJobChatTitle(job.title)) {
          await updateChat(chat._id, {
            title: scheduledJobChatTitle(job.title),
          }).catch(() => {});
        }
        return chat as BoundChat;
      }
    }

    const createdChat = await createChat(userId, job.studioId, scheduledJobChatTitle(job.title));

    const db = await ensureScheduledJobTable();
    await db
      .update<ScheduledJobRow>(
        new StringRecordId(ensureRecordPrefix("scheduled_job", normalizedJobId)),
      )
      .merge({
        chatId: ensureRecordPrefix("chat", createdChat._id),
        updatedAt: Date.now(),
      });

    return createdChat as BoundChat;
  })();

  scheduledJobChatLocks.set(lockKey, run);
  try {
    return await run;
  } finally {
    scheduledJobChatLocks.delete(lockKey);
  }
}

export async function markScheduledJobRun(
  userId: string,
  jobId: string,
  runId: string,
  chatId?: string | null,
) {
  const db = await ensureScheduledJobTable();
  const current = await getScheduledJobForUser(userId, jobId);
  if (!current) return null;
  const next = current.status === "enabled" ? nextRunAt(current) : null;
  const normalizedChatId = chatId ? ensureRecordPrefix("chat", normalizeRouteParam(chatId)) : null;
  const updated = await db
    .update<ScheduledJobRow>(
      new StringRecordId(ensureRecordPrefix("scheduled_job", normalizeRouteParam(jobId))),
    )
    .merge({
      lastRunAt: Date.now(),
      lastRunId: ensureRecordPrefix("chat_run", normalizeRouteParam(runId)),
      chatId: normalizedChatId ?? current.chatId ?? null,
      lastError: null,
      lockedUntil: null,
      nextRunAt: next,
      updatedAt: Date.now(),
    });
  const row = Array.isArray(updated) ? updated[0] : updated;
  const job = withRecordIds(row as ScheduledJobRow);
  await createStudioEvent({
    userId,
    studioId: job.studioId,
    kind: "job.run-started",
    entityType: "scheduled_job",
    entityId: job._id,
    state: "started",
    summary: `${job.title} run started`,
    payload: {
      runId,
      nextRunAt: job.nextRunAt ?? null,
    },
  });
  return job;
}

export async function lockScheduledJob(userId: string, jobId: string, lockMs = 10 * 60 * 1000) {
  const db = await ensureScheduledJobTable();
  const current = await getScheduledJobForUser(userId, jobId);
  const now = Date.now();
  if (
    !current ||
    current.status !== "enabled" ||
    !current.nextRunAt ||
    current.nextRunAt > now ||
    (current.lockedUntil && current.lockedUntil > now)
  ) {
    return null;
  }

  const updated = await db
    .update<ScheduledJobRow>(
      new StringRecordId(ensureRecordPrefix("scheduled_job", normalizeRouteParam(jobId))),
    )
    .merge({
      lockedUntil: now + lockMs,
      updatedAt: now,
    });
  const row = Array.isArray(updated) ? updated[0] : updated;
  return withRecordIds(row as ScheduledJobRow);
}

export async function markScheduledJobAttemptFailed(userId: string, jobId: string, error: string) {
  const db = await ensureScheduledJobTable();
  const current = await getScheduledJobForUser(userId, jobId);
  if (!current) return null;
  const next = current.status === "enabled" ? nextRunAt(current) : null;
  const updated = await db
    .update<ScheduledJobRow>(
      new StringRecordId(ensureRecordPrefix("scheduled_job", normalizeRouteParam(jobId))),
    )
    .merge({
      lastError: error,
      lockedUntil: null,
      nextRunAt: next,
      updatedAt: Date.now(),
    });
  const row = Array.isArray(updated) ? updated[0] : updated;
  const job = withRecordIds(row as ScheduledJobRow);
  await createStudioEvent({
    userId,
    studioId: job.studioId,
    kind: "job.run-failed",
    entityType: "scheduled_job",
    entityId: job._id,
    state: "failed",
    summary: `${job.title} run failed`,
    payload: {
      error,
      nextRunAt: job.nextRunAt ?? null,
    },
  });
  return job;
}
