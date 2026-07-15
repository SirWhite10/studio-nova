import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { reconcileDeployment } from "$lib/server/deployment-orchestration";
import {
  activateDeployment,
  getDeploymentForUser,
  prepareRollbackDeployment,
} from "$lib/server/surreal-deployments";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const current = await getDeploymentForUser(
    userId,
    normalizeRouteParam(event.params.deploymentId),
  );
  if (!current) return json({ error: "Deployment not found" }, { status: 404 });
  const body = (await event.request.json().catch(() => ({}))) as { releaseId?: string };
  const prepared = await prepareRollbackDeployment({
    userId,
    deployment: current,
    releaseId: body.releaseId,
  });
  const reconciled = await reconcileDeployment(prepared.deployment, prepared.release);
  const activated = await activateDeployment(reconciled.deployment);
  return json({ ...prepared, ...reconciled, ...activated });
};
