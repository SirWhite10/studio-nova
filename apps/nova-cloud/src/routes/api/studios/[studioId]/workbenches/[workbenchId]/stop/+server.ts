import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { stopWorkbenchRuntime } from "$lib/server/nova-runtime-control";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getWorkbenchForStudio, stopWorkbenchInstance } from "$lib/server/surreal-workbenches";

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const workbenchId = normalizeRouteParam(event.params.workbenchId);
  const workbench = await getWorkbenchForStudio(userId, studioId, workbenchId);
  if (!workbench) return json({ error: "Workbench not found" }, { status: 404 });

  const runtime = await stopWorkbenchRuntime(workbench._id, {
    studioId,
    sourceVolumeKey: workbench.sourceVolumeKey,
  });
  const stopped = await stopWorkbenchInstance(workbench);
  return json({ ...stopped, runtime: runtime.result });
};
