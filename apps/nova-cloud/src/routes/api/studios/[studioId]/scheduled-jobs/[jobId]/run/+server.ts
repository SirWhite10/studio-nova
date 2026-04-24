import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  ensureScheduledJobChat,
  getScheduledJobForUser,
  markScheduledJobRun,
} from "$lib/server/surreal-scheduled-jobs";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { startChatRunForChat } from "$lib/server/start-chat-run";

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const jobId = normalizeRouteParam(event.params.jobId);
  const job = await getScheduledJobForUser(userId, jobId);

  if (!job || job.studioId !== studioId) {
    return json({ error: "Job not found" }, { status: 404 });
  }

  const chat = await ensureScheduledJobChat(userId, jobId);
  const run = await startChatRunForChat({
    event,
    userId,
    chatId: chat._id,
    content: job.prompt,
    trigger: "schedule",
    triggerSource: `scheduled-job:${job._id}`,
  });

  if ("error" in run) return json(run, { status: run.httpStatus });

  const updatedJob = await markScheduledJobRun(userId, jobId, run.runId, chat._id);

  return json({
    ...run,
    job: updatedJob,
    chatId: chat._id,
    chatTitle: chat.title,
  });
};
