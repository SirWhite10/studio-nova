import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { reverifyDeployment } from "$lib/server/deployment-orchestration";
import {
  activateDeployment,
  deploymentRelease,
  getDeploymentForUser,
} from "$lib/server/surreal-deployments";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const deployment = await getDeploymentForUser(
    userId,
    normalizeRouteParam(event.params.deploymentId),
  );
  if (!deployment) return json({ error: "Deployment not found" }, { status: 404 });
  if (deployment.status === "active") return json({ deployment, alreadyActive: true });
  const release = await deploymentRelease(deployment);
  const verified = await reverifyDeployment(deployment, release);
  return json(await activateDeployment(verified.deployment));
};
