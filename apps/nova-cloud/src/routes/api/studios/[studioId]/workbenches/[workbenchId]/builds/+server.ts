import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import {
  createBuildJob,
  listBuildJobsForWorkbench,
  listBuildTargetProfiles,
} from "$lib/server/surreal-builds";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const workbenchId = normalizeRouteParam(event.params.workbenchId);
  const jobs = await listBuildJobsForWorkbench(userId, studioId, workbenchId);
  if (!jobs) return json({ error: "Workbench not found" }, { status: 404 });
  return json({ jobs, targets: await listBuildTargetProfiles() });
};

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const workbenchId = normalizeRouteParam(event.params.workbenchId);
  const body = (await event.request.json().catch(() => ({}))) as {
    targetProfileId?: string;
    sourceRevision?: string;
    metadata?: Record<string, unknown>;
  };
  if (!body.targetProfileId?.trim() || !body.sourceRevision?.trim()) {
    return json({ error: "targetProfileId and sourceRevision are required" }, { status: 400 });
  }
  const result = await createBuildJob({
    userId,
    studioId,
    workbenchId,
    targetProfileId: body.targetProfileId,
    sourceRevision: body.sourceRevision,
    metadata: body.metadata,
  });
  return json(result, { status: 201 });
};
