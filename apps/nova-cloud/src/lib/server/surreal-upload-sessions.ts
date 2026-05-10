import { StringRecordId, Table } from "surrealdb";
import { getSurreal } from "./surreal";
import {
  ensureRecordPrefix,
  normalizeRouteParam,
  normalizeSurrealRow,
  queryRows,
  recordIdToString,
} from "./surreal-records";

export type UploadSessionStatus =
  | "created"
  | "uploading"
  | "completing"
  | "completed"
  | "failed"
  | "aborted";

export type UploadSessionPart = {
  partNumber: number;
  etag: string;
  size: number;
  updatedAt: number;
};

export type UploadSessionRow = {
  id: unknown;
  userId: string;
  studioId: string;
  uploadId: string;
  path: string;
  fileName: string;
  contentType?: string | null;
  size: number;
  chunkSize: number;
  completedBytes: number;
  status: UploadSessionStatus;
  multipartUploadId: string;
  completedParts: UploadSessionPart[];
  error?: string | null;
  createdAt: number;
  updatedAt: number;
  completedAt?: number | null;
  abortedAt?: number | null;
};

async function ensureUploadSessionTable() {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS upload_session SCHEMALESS");
  return db;
}

export async function getUploadSessionForUser(userId: string, studioId: string, uploadId: string) {
  const db = await ensureUploadSessionTable();
  const fullStudioId = ensureRecordPrefix("studio", normalizeRouteParam(studioId));
  const rows = await queryRows<UploadSessionRow>(
    db,
    "SELECT * FROM upload_session WHERE userId = $userId AND studioId = $studioId AND uploadId = $uploadId LIMIT 1",
    { userId, studioId: fullStudioId, uploadId },
  );
  return rows[0] ? normalizeSurrealRow<UploadSessionRow>(rows[0]) : null;
}

export async function createUploadSession(input: {
  userId: string;
  studioId: string;
  uploadId: string;
  path: string;
  fileName: string;
  contentType?: string | null;
  size: number;
  chunkSize: number;
  multipartUploadId: string;
}) {
  const db = await ensureUploadSessionTable();
  const fullStudioId = ensureRecordPrefix("studio", normalizeRouteParam(input.studioId));
  const now = Date.now();

  const [created] = await db.create(new Table("upload_session")).content({
    userId: input.userId,
    studioId: fullStudioId,
    uploadId: input.uploadId,
    path: input.path,
    fileName: input.fileName,
    contentType: input.contentType ?? null,
    size: input.size,
    chunkSize: input.chunkSize,
    completedBytes: 0,
    status: "created",
    multipartUploadId: input.multipartUploadId,
    completedParts: [],
    error: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    abortedAt: null,
  });

  return normalizeSurrealRow<UploadSessionRow>(created);
}

export async function updateUploadSession(
  userId: string,
  studioId: string,
  uploadId: string,
  updates: Partial<Omit<UploadSessionRow, "id" | "userId" | "studioId" | "uploadId" | "createdAt">>,
) {
  const existing = await getUploadSessionForUser(userId, studioId, uploadId);
  if (!existing) return null;

  const db = await ensureUploadSessionTable();
  const updated = await db.update(new StringRecordId(recordIdToString(existing.id))).merge({
    ...updates,
    updatedAt: Date.now(),
  });

  return normalizeSurrealRow<UploadSessionRow>(updated);
}

export async function recordUploadSessionPart(input: {
  userId: string;
  studioId: string;
  uploadId: string;
  partNumber: number;
  etag: string;
  size: number;
}) {
  const existing = await getUploadSessionForUser(input.userId, input.studioId, input.uploadId);
  if (!existing) return null;

  const nextCompletedBytes = Math.max(
    existing.completedBytes,
    Math.min(existing.size, (input.partNumber - 1) * existing.chunkSize + input.size),
  );
  return updateUploadSession(input.userId, input.studioId, input.uploadId, {
    completedBytes: nextCompletedBytes,
    status: "uploading",
    error: null,
  });
}

export function deriveCompletedParts(
  session: Pick<UploadSessionRow, "chunkSize" | "completedBytes" | "size" | "updatedAt">,
) {
  const completedParts: UploadSessionPart[] = [];
  let remainingBytes = Math.min(session.completedBytes, session.size);
  let partNumber = 1;

  while (remainingBytes > 0) {
    const partSize = Math.min(session.chunkSize, remainingBytes);
    completedParts.push({
      partNumber,
      etag: `stored-part-${partNumber}`,
      size: partSize,
      updatedAt: session.updatedAt,
    });
    remainingBytes -= partSize;
    partNumber += 1;
  }

  return completedParts;
}

export async function markUploadSessionFailed(
  userId: string,
  studioId: string,
  uploadId: string,
  error: string,
) {
  return updateUploadSession(userId, studioId, uploadId, {
    status: "failed",
    error,
  });
}

export async function markUploadSessionCompleted(
  userId: string,
  studioId: string,
  uploadId: string,
) {
  const now = Date.now();
  return updateUploadSession(userId, studioId, uploadId, {
    status: "completed",
    error: null,
    completedAt: now,
  });
}

export async function markUploadSessionAborted(userId: string, studioId: string, uploadId: string) {
  const now = Date.now();
  return updateUploadSession(userId, studioId, uploadId, {
    status: "aborted",
    abortedAt: now,
  });
}
