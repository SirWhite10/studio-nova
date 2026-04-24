import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  deleteScheduledJob,
  getScheduledJobForUser,
  updateScheduledJob,
  type ScheduledJobInput,
} from "$lib/server/surreal-scheduled-jobs";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";

function parseJobInput(body: unknown): ScheduledJobInput | { error: string } {
  const input = body as Partial<ScheduledJobInput> | null;
  const prompt = input?.prompt?.trim();
  if (!prompt) return { error: "prompt is required" };

  const frequency = input?.frequency ?? "daily";
  if (!["every_minutes", "hourly", "daily", "weekly"].includes(frequency)) {
    return { error: "frequency is invalid" };
  }

  return {
    title: input?.title ?? null,
    prompt,
    frequency,
    intervalMinutes: input?.intervalMinutes ?? null,
    timeOfDay: input?.timeOfDay ?? null,
    weekday: input?.weekday ?? null,
    enabled: input?.enabled ?? true,
  };
}

export const PATCH: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const jobId = normalizeRouteParam(event.params.jobId);
  const job = await getScheduledJobForUser(userId, jobId);
  if (!job || job.studioId !== normalizeRouteParam(event.params.studioId)) {
    return json({ error: "Job not found" }, { status: 404 });
  }

  const input = parseJobInput(await event.request.json().catch(() => null));
  if ("error" in input) return json(input, { status: 400 });

  const updated = await updateScheduledJob(userId, jobId, input);
  return json({ job: updated });
};

export const DELETE: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const jobId = normalizeRouteParam(event.params.jobId);
  const job = await getScheduledJobForUser(userId, jobId);
  if (!job || job.studioId !== normalizeRouteParam(event.params.studioId)) {
    return json({ error: "Job not found" }, { status: 404 });
  }

  await deleteScheduledJob(userId, jobId);
  return json({ ok: true });
};
