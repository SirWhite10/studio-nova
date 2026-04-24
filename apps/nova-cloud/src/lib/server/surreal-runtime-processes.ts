import { StringRecordId, Table } from "surrealdb";
import { markArtifactStatus, upsertArtifact } from "./surreal-artifacts";
import { createStudioEvent } from "./surreal-studio-events";
import { getSurreal } from "./surreal";
import { ensureRecordPrefix, queryRows, recordIdToString, withRecordIds } from "./surreal-records";

export type RuntimeProcessRow = {
  id: unknown;
  userId: string;
  studioId: string;
  sandboxId: string;
  label: string;
  command: string;
  cwd: string;
  pid: number;
  port?: number;
  previewUrl?: string;
  status: "starting" | "running" | "stopped" | "failed";
  logSummary?: string;
  createdAt: number;
  updatedAt: number;
};

async function ensureRuntimeProcessTable() {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS runtime_process SCHEMALESS").collect();
  return db;
}

export async function getPrimaryForStudio(userId: string, studioId: string) {
  const db = await ensureRuntimeProcessTable();
  const fullId = ensureRecordPrefix("studio", studioId);
  const rows = await queryRows<RuntimeProcessRow>(
    db,
    "SELECT * FROM runtime_process WHERE userId = $userId AND studioId = $studioId ORDER BY updatedAt DESC LIMIT 1",
    { userId, studioId: fullId },
  );
  return rows[0] ? withRecordIds(rows[0]) : null;
}

export async function listPrimaryProcessesForUser(userId: string) {
  const db = await ensureRuntimeProcessTable();
  const rows = await queryRows<RuntimeProcessRow>(
    db,
    "SELECT * FROM runtime_process WHERE userId = $userId ORDER BY updatedAt DESC",
    { userId },
  );
  return rows.map((row) => withRecordIds(row));
}

export async function upsertPrimaryForStudio(
  userId: string,
  studioId: string,
  process: {
    sandboxId: string;
    label: string;
    command: string;
    cwd: string;
    pid: number;
    port?: number;
    previewUrl?: string;
    status: "starting" | "running" | "stopped" | "failed";
    logSummary?: string;
  },
) {
  const db = await ensureRuntimeProcessTable();
  const fullId = ensureRecordPrefix("studio", studioId);
  const now = Date.now();

  const existing = await getPrimaryForStudio(userId, studioId);
  if (existing) {
    const rid = recordIdToString(existing.id);
    const updated = await db
      .update<RuntimeProcessRow>(new StringRecordId(rid))
      .merge({ ...process, updatedAt: now });
    const row = withRecordIds((Array.isArray(updated) ? updated[0] : updated) as RuntimeProcessRow);
    await syncPreviewArtifact(userId, studioId, row);
    await createStudioEvent({
      userId,
      studioId,
      kind: "runtime.preview",
      entityType: "runtime_process",
      entityId: row._id,
      state: row.status,
      summary: `${row.label || "Primary preview"} is ${row.status}`,
      payload: {
        pid: row.pid,
        port: row.port ?? null,
        previewUrl: row.previewUrl ?? null,
        logSummary: row.logSummary ?? null,
      },
    });
    return row;
  }

  const created = await db.create(new Table("runtime_process")).content({
    userId,
    studioId: fullId,
    ...process,
    createdAt: now,
    updatedAt: now,
  });
  const row = withRecordIds((Array.isArray(created) ? created[0] : created) as RuntimeProcessRow);
  await syncPreviewArtifact(userId, studioId, row);
  await createStudioEvent({
    userId,
    studioId,
    kind: "runtime.preview",
    entityType: "runtime_process",
    entityId: row._id,
    state: row.status,
    summary: `${row.label || "Primary preview"} is ${row.status}`,
    payload: {
      pid: row.pid,
      port: row.port ?? null,
      previewUrl: row.previewUrl ?? null,
      logSummary: row.logSummary ?? null,
    },
  });
  return row;
}

export async function markPrimaryStopped(userId: string, studioId: string) {
  const db = await ensureRuntimeProcessTable();
  const fullId = ensureRecordPrefix("studio", studioId);
  const stoppedAt = Date.now();
  await db.query(
    "UPDATE runtime_process SET status = 'stopped', updatedAt = $now WHERE userId = $userId AND studioId = $studioId",
    { userId, studioId: fullId, now: stoppedAt },
  );
  await markArtifactStatus({
    userId,
    studioId,
    kind: "preview",
    key: "primary-preview",
    status: "stopped",
    metadata: { stoppedAt },
  });
  await createStudioEvent({
    userId,
    studioId,
    kind: "runtime.preview",
    entityType: "runtime_process",
    state: "stopped",
    summary: "Primary preview stopped",
    payload: { stoppedAt },
  });
}

async function syncPreviewArtifact(
  userId: string,
  studioId: string,
  process: RuntimeProcessRow & { _id?: string },
) {
  await upsertArtifact({
    userId,
    studioId,
    kind: "preview",
    key: "primary-preview",
    title: process.label || "Primary Preview",
    status:
      process.status === "failed" ? "failed" : process.status === "stopped" ? "stopped" : "ready",
    url: process.previewUrl ?? null,
    source: "runtime-process",
    metadata: {
      runtimeProcessId: process._id ?? null,
      sandboxId: process.sandboxId,
      pid: process.pid,
      port: process.port ?? null,
      command: process.command,
      cwd: process.cwd,
      previewStatus: process.status,
      logSummary: process.logSummary ?? null,
    },
  });
}
