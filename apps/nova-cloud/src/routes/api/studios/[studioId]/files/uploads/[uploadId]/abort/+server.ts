import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { abortMultipartUpload } from "$lib/server/r2-files";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import {
  getUploadSessionForUser,
  markUploadSessionAborted,
  markUploadSessionFailed,
} from "$lib/server/surreal-upload-sessions";

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
      return json({ error: "Completed uploads cannot be aborted" }, { status: 409 });
    }
    if (session.status === "aborted") {
      return json({ success: true, uploadId, alreadyAborted: true });
    }

    try {
      await abortMultipartUpload(event, userId, studioId, session.path, session.multipartUploadId);
      await markUploadSessionAborted(userId, studioId, uploadId);
      return json({ success: true, uploadId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to abort upload";
      await markUploadSessionFailed(userId, studioId, uploadId, message);
      return json({ error: message }, { status: 500 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 500 });
  }
};
