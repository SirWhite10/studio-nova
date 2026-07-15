import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { resumeWorkbenchRuntime } from "$lib/server/nova-runtime-control";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import {
  activateWorkbenchInstance,
  findHabitatNode,
  getWorkbenchForStudio,
} from "$lib/server/surreal-workbenches";

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const workbenchId = normalizeRouteParam(event.params.workbenchId);
  const workbench = await getWorkbenchForStudio(userId, studioId, workbenchId);
  if (!workbench) return json({ error: "Workbench not found" }, { status: 404 });

  const habitat = await findHabitatNode();
  if (!habitat) {
    return json({ error: "No Habitat node is registered" }, { status: 409 });
  }
  const body = (await event.request.json().catch(() => ({}))) as {
    systemPackages?: string[];
  };
  const runtime = await resumeWorkbenchRuntime(workbench._id, {
    studioId,
    sourceVolumeKey: workbench.sourceVolumeKey,
    systemPackages: body.systemPackages,
  });
  if (!runtime.result.providerInstanceId) {
    throw new Error("Habitat did not return a provider instance identity");
  }
  const activated = await activateWorkbenchInstance({
    workbench,
    nodeId: habitat._id,
    provider: "k3s",
    providerInstanceId: runtime.result.providerInstanceId,
    previewEndpoint: runtime.result.previewEndpoint,
  });
  return json({ ...activated, runtime: runtime.result });
};
