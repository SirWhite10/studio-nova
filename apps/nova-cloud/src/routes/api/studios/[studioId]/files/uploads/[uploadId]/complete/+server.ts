import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import {
  completeMultipartUpload,
  fileExists,
  listMultipartUploadParts,
} from "$lib/server/r2-files";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { upsertArtifact } from "$lib/server/surreal-artifacts";
import { getUploadSessionForUser } from "$lib/server/surreal-upload-sessions";

export const POST: RequestHandler = async (event) => {
  try {
    const userId = requireUserId(event.locals);
    const studioId = normalizeRouteParam(event.params.studioId!);
    const uploadId = normalizeRouteParam(event.params.uploadId!);
    const session = await getUploadSessionForUser(userId, studioId, uploadId);

    if (!session) {
      return json({ error: "Upload session not found" }, { status: 404 });
    }
    if (session.status === "completed") {
      return json({ success: true, uploadId, path: session.path, alreadyCompleted: true });
    }
    if (session.status === "aborted") {
      return json({ error: "Upload session is aborted" }, { status: 409 });
    }

    if (await fileExists(event, userId, studioId, session.path)) {
      return json({ success: true, uploadId, path: session.path, alreadyCompleted: true });
    }

    const completedParts = await listMultipartUploadParts(event, userId, studioId, uploadId);
    const completedBytes = completedParts.reduce((sum, part) => sum + part.size, 0);

    if (completedBytes < session.size) {
      return json(
        {
          error: `Upload is incomplete (${completedBytes}/${session.size} bytes uploaded)`,
        },
        { status: 409 },
      );
    }

    try {
      const parts = [...completedParts]
        .sort((a, b) => a.partNumber - b.partNumber)
        .map((part) => ({ partNumber: part.partNumber, etag: part.etag }));

      await completeMultipartUpload(
        event,
        userId,
        studioId,
        session.path,
        session.multipartUploadId,
        parts,
      );

      await upsertArtifact({
        userId,
        studioId,
        kind: "file",
        key: session.path,
        title: session.fileName,
        path: session.path,
        contentType: session.contentType ?? null,
        size: session.size,
        source: "r2-multipart-upload",
        metadata: {
          uploadId,
          chunkSize: session.chunkSize,
          completedParts: completedParts.length,
        },
      });

      return json({
        success: true,
        uploadId,
        path: session.path,
        size: session.size,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to complete upload";
      return json({ error: message }, { status: 500 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 500 });
  }
};
