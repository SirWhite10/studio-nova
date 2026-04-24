import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { uploadMultipartPart } from "$lib/server/r2-files";
import {
  getUploadSessionForUser,
  markUploadSessionFailed,
} from "$lib/server/surreal-upload-sessions";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";

function parsePartNumber(raw: string) {
  const partNumber = Number.parseInt(raw, 10);
  if (!Number.isInteger(partNumber) || partNumber <= 0) {
    throw new Error("Part number must be a positive integer");
  }
  return partNumber;
}

const uploadPart: RequestHandler = async (event) => {
  try {
    const userId = requireUserId(event.locals);
    const studioId = normalizeRouteParam(event.params.studioId!);
    const uploadId = normalizeRouteParam(event.params.uploadId!);
    const partNumber = parsePartNumber(event.params.partNumber!);
    const session = await getUploadSessionForUser(userId, studioId, uploadId);

    if (!session) {
      return json({ error: "Upload session not found" }, { status: 404 });
    }
    if (session.status === "completed") {
      return json({ error: "Upload session is already completed" }, { status: 409 });
    }
    if (session.status === "aborted") {
      return json({ error: "Upload session is aborted" }, { status: 409 });
    }

    const contentType = event.request.headers.get("content-type")?.split(";", 1)[0]?.trim();
    if (contentType !== "application/octet-stream") {
      return json({ error: "Upload chunks must use application/octet-stream" }, { status: 415 });
    }

    const data = await event.request.arrayBuffer();

    if (data.byteLength === 0) {
      return json({ error: "Chunk payload is empty" }, { status: 400 });
    }

    try {
      const uploadedPart = await uploadMultipartPart(
        event,
        userId,
        studioId,
        session.path,
        session.multipartUploadId,
        partNumber,
        data,
      );

      return json({
        uploadId,
        partNumber,
        etag: uploadedPart.etag,
        completedBytes: Math.min(
          session.size,
          Math.max(session.completedBytes, (partNumber - 1) * session.chunkSize + data.byteLength),
        ),
        status: "uploading",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload chunk";
      await markUploadSessionFailed(userId, studioId, uploadId, message);
      return json({ error: message }, { status: 500 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 500 });
  }
};

export const PUT = uploadPart;
export const POST = uploadPart;
