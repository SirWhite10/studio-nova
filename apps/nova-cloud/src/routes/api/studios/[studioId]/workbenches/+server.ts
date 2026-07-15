import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import {
  createWorkbenchForStudio,
  listWorkbenchesForStudio,
} from "$lib/server/surreal-workbenches";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  return json({ workbenches: await listWorkbenchesForStudio(userId, studioId) });
};

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const body = (await event.request.json().catch(() => ({}))) as {
    name?: string;
    slug?: string;
  };
  const result = await createWorkbenchForStudio({
    userId,
    studioId,
    name: body.name?.trim() || "New Workbench",
    slug: body.slug,
  });
  return json(result, { status: result.created ? 201 : 200 });
};
