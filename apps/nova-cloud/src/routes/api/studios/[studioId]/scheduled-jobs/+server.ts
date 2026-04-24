import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  createScheduledJob,
  listScheduledJobsForStudio,
  type ScheduledJobInput,
} from "$lib/server/surreal-scheduled-jobs";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getStudioForUser } from "$lib/server/surreal-studios";

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

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const jobs = await listScheduledJobsForStudio(userId, studioId);
  return json({ jobs });
};

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const studio = await getStudioForUser(userId, studioId);
  if (!studio) return json({ error: "Studio not found" }, { status: 404 });

  const input = parseJobInput(await event.request.json().catch(() => null));
  if ("error" in input) return json(input, { status: 400 });

  const job = await createScheduledJob(userId, studioId, input);
  return json({ job }, { status: 201 });
};
