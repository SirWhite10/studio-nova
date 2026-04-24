import {
  ensureScheduledJobChat,
  listDueScheduledJobs,
  lockScheduledJob,
  markScheduledJobAttemptFailed,
  markScheduledJobRun,
} from "$lib/server/surreal-scheduled-jobs";
import { startChatRunForChat } from "$lib/server/start-chat-run";
import type { RequestEvent } from "@sveltejs/kit";

export async function runDueScheduledJobs(event: RequestEvent, limit = 10) {
  const dueJobs = await listDueScheduledJobs(limit);
  const results: Array<{
    jobId: string;
    status: "started" | "skipped" | "failed";
    runId?: string;
    error?: string;
  }> = [];

  for (const job of dueJobs) {
    const locked = await lockScheduledJob(job.userId, job._id);
    if (!locked) {
      results.push({ jobId: job._id, status: "skipped", error: "Job was already claimed" });
      continue;
    }

    try {
      const chat = await ensureScheduledJobChat(job.userId, job._id);
      const run = await startChatRunForChat({
        event,
        userId: job.userId,
        chatId: chat._id,
        content: job.prompt,
        trigger: "schedule",
        triggerSource: `scheduled-job:${job._id}`,
      });

      if ("error" in run) {
        const message = run.error || "Scheduled job failed to start";
        await markScheduledJobAttemptFailed(job.userId, job._id, message);
        results.push({ jobId: job._id, status: "failed", error: message });
        continue;
      }

      await markScheduledJobRun(job.userId, job._id, run.runId, chat._id);
      results.push({ jobId: job._id, status: "started", runId: run.runId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scheduled job failed to start";
      await markScheduledJobAttemptFailed(job.userId, job._id, message);
      results.push({ jobId: job._id, status: "failed", error: message });
    }
  }

  return {
    checked: dueJobs.length,
    started: results.filter((result) => result.status === "started").length,
    failed: results.filter((result) => result.status === "failed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    results,
  };
}
