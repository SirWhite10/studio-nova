import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { getChatRunForUser } from "$lib/server/surreal-chat-runs";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const runId = event.params.runId as string;

  const run = await getChatRunForUser(userId, runId);
  if (!run) {
    return json({ error: "Run not found" }, { status: 404 });
  }

  return json({
    runId: run._id,
    status: run.status,
    streamKey: run.streamKey,
    liveAttachable: run.liveAttachable,
    error: run.error,
  });
};
