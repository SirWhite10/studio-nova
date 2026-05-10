import { Table } from "surrealdb";
import { getSurreal } from "./surreal";
import { createStudioEvent } from "./surreal-studio-events";
import {
  ensureRecordPrefix,
  normalizeRouteParam,
  normalizeSurrealRow,
  normalizeSurrealRows,
  queryRows,
  tableRecordId,
} from "./surreal-records";

export type ArtifactKind = "file" | "preview" | "generated" | "deploy-output";
export type ArtifactStatus = "ready" | "deleted" | "stopped" | "failed";

export type ArtifactRow = {
  id: unknown;
  userId: string;
  studioId: string;
  kind: ArtifactKind;
  key: string;
  title: string;
  status: ArtifactStatus;
  path?: string | null;
  url?: string | null;
  contentType?: string | null;
  size?: number | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
};

async function ensureArtifactTable() {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS artifact SCHEMALESS");
  return db;
}

async function getArtifactByKey(userId: string, studioId: string, kind: ArtifactKind, key: string) {
  const db = await ensureArtifactTable();
  const fullStudioId = ensureRecordPrefix("studio", normalizeRouteParam(studioId));
  const rows = await queryRows<ArtifactRow>(
    db,
    "SELECT * FROM artifact WHERE userId = $userId AND studioId = $studioId AND kind = $kind AND key = $key LIMIT 1",
    { userId, studioId: fullStudioId, kind, key },
  );
  return rows[0] ? normalizeSurrealRow<ArtifactRow>(rows[0]) : null;
}

export async function listArtifactsForStudio(
  userId: string,
  studioId: string,
  kinds?: ArtifactKind[],
) {
  const db = await ensureArtifactTable();
  const fullStudioId = ensureRecordPrefix("studio", normalizeRouteParam(studioId));
  const rows = kinds?.length
    ? await queryRows<ArtifactRow>(
        db,
        "SELECT * FROM artifact WHERE userId = $userId AND studioId = $studioId AND kind INSIDE $kinds ORDER BY updatedAt DESC",
        { userId, studioId: fullStudioId, kinds },
      )
    : await queryRows<ArtifactRow>(
        db,
        "SELECT * FROM artifact WHERE userId = $userId AND studioId = $studioId ORDER BY updatedAt DESC",
        { userId, studioId: fullStudioId },
      );
  return normalizeSurrealRows<ArtifactRow>(rows);
}

export async function upsertArtifact(input: {
  userId: string;
  studioId: string;
  kind: ArtifactKind;
  key: string;
  title: string;
  status?: ArtifactStatus;
  path?: string | null;
  url?: string | null;
  contentType?: string | null;
  size?: number | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const db = await ensureArtifactTable();
  const now = Date.now();
  const fullStudioId = ensureRecordPrefix("studio", normalizeRouteParam(input.studioId));
  const existing = await getArtifactByKey(input.userId, input.studioId, input.kind, input.key);

  const payload = {
    userId: input.userId,
    studioId: fullStudioId,
    kind: input.kind,
    key: input.key,
    title: input.title,
    status: input.status ?? "ready",
    path: input.path ?? null,
    url: input.url ?? null,
    contentType: input.contentType ?? null,
    size: input.size ?? null,
    source: input.source ?? null,
    metadata: input.metadata ?? null,
    updatedAt: now,
  };

  if (existing) {
    const updated = await db.update(tableRecordId("artifact", existing.id)).merge(payload);
    const row = normalizeSurrealRow<ArtifactRow>(updated);
    await createStudioEvent({
      userId: input.userId,
      studioId: input.studioId,
      kind: input.kind === "deploy-output" ? "deploy.updated" : "artifact.upserted",
      entityType: "artifact",
      entityId: row._id,
      state: row.status,
      summary: `${row.title} updated`,
      payload: {
        kind: row.kind,
        status: row.status,
        url: row.url ?? null,
        path: row.path ?? null,
      },
    });
    return row;
  }

  const [created] = await db.create(new Table("artifact")).content({
    ...payload,
    createdAt: now,
  });
  const row = normalizeSurrealRow<ArtifactRow>(created);
  await createStudioEvent({
    userId: input.userId,
    studioId: input.studioId,
    kind: input.kind === "deploy-output" ? "deploy.updated" : "artifact.upserted",
    entityType: "artifact",
    entityId: row._id,
    state: row.status,
    summary: `${row.title} created`,
    payload: {
      kind: row.kind,
      status: row.status,
      url: row.url ?? null,
      path: row.path ?? null,
    },
  });
  return row;
}

export async function markArtifactStatus(input: {
  userId: string;
  studioId: string;
  kind: ArtifactKind;
  key: string;
  status: ArtifactStatus;
  metadata?: Record<string, unknown> | null;
}) {
  const existing = await getArtifactByKey(input.userId, input.studioId, input.kind, input.key);
  if (!existing) return null;

  const db = await ensureArtifactTable();
  const updated = await db.update(tableRecordId("artifact", existing.id)).merge({
    status: input.status,
    metadata: input.metadata ?? existing.metadata ?? null,
    updatedAt: Date.now(),
  });
  const row = normalizeSurrealRow<ArtifactRow>(updated);
  await createStudioEvent({
    userId: input.userId,
    studioId: input.studioId,
    kind: input.kind === "deploy-output" ? "deploy.updated" : "artifact.upserted",
    entityType: "artifact",
    entityId: row._id,
    state: row.status,
    summary: `${row.title} marked ${row.status}`,
    payload: {
      kind: row.kind,
      status: row.status,
      url: row.url ?? null,
      path: row.path ?? null,
    },
  });
  return row;
}
