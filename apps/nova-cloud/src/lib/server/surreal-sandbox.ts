import { StringRecordId, Table } from "surrealdb";
import { getSurreal } from "./surreal";
import { ensureRecordPrefix, queryRows, recordIdToString, withRecordIds } from "./surreal-records";

export type SandboxRow = {
  id: unknown;
  userId: string;
  studioId?: string;
  sandboxId: string;
  templateId: string;
  status: "active" | "expired" | "creating" | "paused" | "unhealthy" | "limit-reached";
  lastUsedAt: number;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
};

async function ensureSandboxTable() {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS sandbox SCHEMALESS").collect();
  return db;
}

export async function getSandboxForStudio(userId: string, studioId: string) {
  const db = await ensureSandboxTable();
  const fullId = ensureRecordPrefix("studio", studioId);
  const rows = await queryRows<SandboxRow>(
    db,
    "SELECT * FROM sandbox WHERE userId = $userId AND studioId = $studioId LIMIT 1",
    { userId, studioId: fullId },
  );
  return rows[0] ? withRecordIds(rows[0]) : null;
}

export async function getSandboxForUser(userId: string) {
  const db = await ensureSandboxTable();
  const rows = await queryRows<SandboxRow>(
    db,
    "SELECT * FROM sandbox WHERE userId = $userId ORDER BY lastUsedAt DESC LIMIT 1",
    { userId },
  );
  return rows[0] ? withRecordIds(rows[0]) : null;
}

export async function listSandboxesForUser(userId: string) {
  const db = await ensureSandboxTable();
  const rows = await queryRows<SandboxRow>(
    db,
    "SELECT * FROM sandbox WHERE userId = $userId ORDER BY updatedAt DESC",
    { userId },
  );
  return rows.map((row) => withRecordIds(row));
}

export async function upsertSandbox(input: {
  userId: string;
  studioId?: string;
  sandboxId: string;
  templateId: string;
  status: SandboxRow["status"];
  expiresAt: number;
}) {
  const db = await ensureSandboxTable();
  const now = Date.now();
  const fullStudioId = input.studioId ? ensureRecordPrefix("studio", input.studioId) : undefined;

  if (fullStudioId) {
    const existing = await getSandboxForStudio(input.userId, input.studioId!);
    if (existing) {
      const rid = recordIdToString(existing.id);
      const updated = await db.update<SandboxRow>(new StringRecordId(rid)).merge({
        sandboxId: input.sandboxId,
        templateId: input.templateId,
        status: input.status,
        expiresAt: input.expiresAt,
        updatedAt: now,
      });
      return withRecordIds((Array.isArray(updated) ? updated[0] : updated) as SandboxRow);
    }
  }

  const created = await db.create(new Table("sandbox")).content({
    userId: input.userId,
    studioId: fullStudioId ?? null,
    sandboxId: input.sandboxId,
    templateId: input.templateId,
    status: input.status,
    lastUsedAt: now,
    expiresAt: input.expiresAt,
    createdAt: now,
    updatedAt: now,
  });
  return withRecordIds((Array.isArray(created) ? created[0] : created) as SandboxRow);
}

export async function markSandboxExpired(userId: string, studioId?: string) {
  const db = await ensureSandboxTable();

  if (studioId) {
    const fullId = ensureRecordPrefix("studio", studioId);
    await db.query(
      "UPDATE sandbox SET status = 'expired', updatedAt = $now WHERE userId = $userId AND studioId = $studioId",
      { userId, studioId: fullId, now: Date.now() },
    );
  } else {
    await db.query(
      "UPDATE sandbox SET status = 'expired', updatedAt = $now WHERE userId = $userId",
      { userId, now: Date.now() },
    );
  }
}

export async function touchSandboxLastUsed(userId: string, studioId?: string) {
  const db = await ensureSandboxTable();
  const now = Date.now();

  if (studioId) {
    const fullId = ensureRecordPrefix("studio", studioId);
    await db.query(
      "UPDATE sandbox SET lastUsedAt = $now, updatedAt = $now WHERE userId = $userId AND studioId = $studioId",
      { userId, studioId: fullId, now },
    );
  } else {
    await db.query(
      "UPDATE sandbox SET lastUsedAt = $now, updatedAt = $now WHERE userId = $userId",
      { userId, now },
    );
  }
}
