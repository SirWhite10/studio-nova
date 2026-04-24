import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { getChatRunForUser, updateChatRunStatus } from "$lib/server/surreal-chat-runs";
import { abortRunSession } from "$lib/server/chat-run-registry";

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const runId = event.params.runId as string;

  const run = await getChatRunForUser(userId, runId);
  if (!run) {
    return json({ error: "Run not found" }, { status: 404 });
  }

  abortRunSession(run._id, run.streamKey);
  const updated = await updateChatRunStatus(run._id, "aborted", {
    liveAttachable: false,
    endedAt: Date.now(),
    error: null,
  });

  return json({
    runId: updated._id,
    status: updated.status,
  });
};
