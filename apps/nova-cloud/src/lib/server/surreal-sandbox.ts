import { StringRecordId, Table } from "surrealdb";
import { getSurreal } from "./surreal";
import { ensureRecordPrefix, queryRows, recordIdToString, withRecordIds } from "./surreal-records";
import { ensureTables } from "./surreal-tables";

export type SandboxRow = {
  _id: string;
  id: unknown;
  userId: string;
  studioId?: string;
  workspaceId?: string | null;
  sandboxId: string;
  templateId: string;
  status: "active" | "expired" | "creating" | "paused" | "unhealthy" | "limit-reached";
  lastUsedAt: number;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
};

async function ensureSandboxTable() {
  await ensureTables();
  return getSurreal();
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
  workspaceId?: string | null;
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
      const patch: Record<string, unknown> = {
        sandboxId: input.sandboxId,
        templateId: input.templateId,
        status: input.status,
        expiresAt: input.expiresAt,
        updatedAt: now,
      };
      const nextWorkspaceId = input.workspaceId ?? existing.workspaceId;
      if (nextWorkspaceId) patch.workspaceId = nextWorkspaceId;
      if (fullStudioId) patch.studioId = fullStudioId;
      const updated = await db.update<SandboxRow>(new StringRecordId(rid)).merge(patch);
      return withRecordIds((Array.isArray(updated) ? updated[0] : updated) as SandboxRow);
    }
  }

  const content: Record<string, unknown> = {
    userId: input.userId,
    sandboxId: input.sandboxId,
    templateId: input.templateId,
    status: input.status,
    lastUsedAt: now,
    expiresAt: input.expiresAt,
    createdAt: now,
    updatedAt: now,
  };
  if (fullStudioId) content.studioId = fullStudioId;
  if (input.workspaceId) content.workspaceId = input.workspaceId;

  const created = await db.create(new Table("sandbox")).content(content);
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
