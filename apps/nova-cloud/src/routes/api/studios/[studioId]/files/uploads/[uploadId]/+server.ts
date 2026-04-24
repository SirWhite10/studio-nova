import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { fileExists, listMultipartUploadParts } from "$lib/server/r2-files";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getUploadSessionForUser } from "$lib/server/surreal-upload-sessions";

export const GET: RequestHandler = async (event) => {
  try {
    const userId = requireUserId(event.locals);
    const studioId = normalizeRouteParam(event.params.studioId!);
    const uploadId = normalizeRouteParam(event.params.uploadId!);
    const session = await getUploadSessionForUser(userId, studioId, uploadId);

    if (!session) {
      return json({ error: "Upload session not found" }, { status: 404 });
    }

    const stagedParts =
      session.status === "completed" || session.status === "aborted"
        ? []
        : await listMultipartUploadParts(event, userId, studioId, uploadId);
    const finalFilePresent =
      session.status === "aborted"
        ? false
        : await fileExists(event, userId, studioId, session.path);
    const completedBytes =
      session.status === "completed" || finalFilePresent
        ? session.size
        : stagedParts.reduce((sum, part) => sum + part.size, 0);
    const completedParts = stagedParts.map((part) => ({
      partNumber: part.partNumber,
      etag: part.etag,
    }));

    return json({
      uploadId: session.uploadId,
      path: session.path,
      fileName: session.fileName,
      contentType: session.contentType ?? null,
      size: session.size,
      chunkSize: session.chunkSize,
      completedBytes,
      status:
        session.status === "completed" || finalFilePresent
          ? "completed"
          : session.status === "aborted" || session.status === "failed"
            ? session.status
            : completedBytes > 0
              ? "uploading"
              : session.status,
      completedParts,
      error: session.error ?? null,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      completedAt: session.completedAt ?? null,
      abortedAt: session.abortedAt ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 500 });
  }
};
