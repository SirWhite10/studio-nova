import { Table } from "surrealdb";
import { getSurreal } from "./surreal";
import {
  ensureRecordPrefix,
  normalizeRouteParam,
  normalizeSurrealRow,
  normalizeSurrealRows,
  queryRows,
} from "./surreal-records";

export type StudioEventKind =
  | "studio.updated"
  | "integration.updated"
  | "runtime.status"
  | "runtime.preview"
  | "artifact.upserted"
  | "deploy.updated"
  | "job.updated"
  | "job.run-started"
  | "job.run-failed";

export type StudioEventRow = {
  id: unknown;
  userId: string;
  studioId: string;
  kind: StudioEventKind;
  entityType: string;
  entityId?: string | null;
  state?: string | null;
  summary: string;
  payload?: Record<string, unknown> | null;
  createdAt: number;
};

async function ensureStudioEventTable() {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS studio_event SCHEMALESS");
  return db;
}

export async function createStudioEvent(input: {
  userId: string;
  studioId: string;
  kind: StudioEventKind;
  entityType: string;
  entityId?: string | null;
  state?: string | null;
  summary: string;
  payload?: Record<string, unknown> | null;
}) {
  const db = await ensureStudioEventTable();
  const [created] = await db.create(new Table("studio_event"), {
    userId: input.userId,
    studioId: ensureRecordPrefix("studio", normalizeRouteParam(input.studioId)),
    kind: input.kind,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    state: input.state ?? null,
    summary: input.summary,
    payload: input.payload ?? null,
    createdAt: Date.now(),
  });
  return normalizeSurrealRow<StudioEventRow>(created);
}

export async function listStudioEventsSince(
  userId: string,
  studioId: string,
  afterCreatedAt: number,
  limit = 50,
) {
  const db = await ensureStudioEventTable();
  const rows = await queryRows<StudioEventRow>(
    db,
    "SELECT * FROM studio_event WHERE userId = $userId AND studioId = $studioId AND createdAt >= $afterCreatedAt ORDER BY createdAt ASC LIMIT $limit",
    {
      userId,
      studioId: ensureRecordPrefix("studio", normalizeRouteParam(studioId)),
      afterCreatedAt,
      limit,
    },
  );
  return normalizeSurrealRows<StudioEventRow>(rows);
}

export async function listRecentStudioEvents(userId: string, studioId: string, limit = 20) {
  const db = await ensureStudioEventTable();
  const rows = await queryRows<StudioEventRow>(
    db,
    "SELECT * FROM studio_event WHERE userId = $userId AND studioId = $studioId ORDER BY createdAt DESC LIMIT $limit",
    {
      userId,
      studioId: ensureRecordPrefix("studio", normalizeRouteParam(studioId)),
      limit,
    },
  );
  return normalizeSurrealRows<StudioEventRow>(rows);
}
