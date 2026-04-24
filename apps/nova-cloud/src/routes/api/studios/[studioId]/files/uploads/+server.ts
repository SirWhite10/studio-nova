import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { createMultipartUpload } from "$lib/server/r2-files";
import { createUploadSession } from "$lib/server/surreal-upload-sessions";
import {
  buildUploadPath,
  DEFAULT_UPLOAD_CHUNK_SIZE,
  ensureUploadPathAvailable,
  resolveUploadTarget,
  validateUploadFileName,
} from "./_shared";

export const POST: RequestHandler = async (event) => {
  try {
    const payload = (await event.request.json()) as {
      fileName?: string;
      size?: number;
      contentType?: string;
      path?: string;
      chunkSize?: number;
    };

    const fileName = validateUploadFileName(payload.fileName);
    const size = typeof payload.size === "number" ? payload.size : NaN;
    if (!Number.isFinite(size) || size <= 0) {
      return json({ error: "File size must be greater than 0" }, { status: 400 });
    }

    const chunkSize =
      typeof payload.chunkSize === "number" &&
      Number.isFinite(payload.chunkSize) &&
      payload.chunkSize > 0
        ? Math.floor(payload.chunkSize)
        : DEFAULT_UPLOAD_CHUNK_SIZE;

    const { userId, studioId, normalizedPath } = await resolveUploadTarget(event, payload.path);
    await ensureUploadPathAvailable({
      event,
      userId,
      studioId,
      folderPath: normalizedPath,
      fileName,
    });

    const finalPath = buildUploadPath(normalizedPath, fileName);
    const uploadId = crypto.randomUUID();
    const multipart = await createMultipartUpload(
      event,
      userId,
      studioId,
      finalPath,
      payload.contentType || "application/octet-stream",
      uploadId,
    );

    const session = await createUploadSession({
      userId,
      studioId,
      uploadId,
      path: finalPath,
      fileName,
      contentType: payload.contentType || null,
      size,
      chunkSize,
      multipartUploadId: multipart.uploadId,
    });

    return json({
      uploadId: session.uploadId,
      path: session.path,
      fileName: session.fileName,
      size: session.size,
      chunkSize: session.chunkSize,
      status: session.status,
      completedBytes: session.completedBytes,
      completedParts: session.completedParts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 500 });
  }
};
