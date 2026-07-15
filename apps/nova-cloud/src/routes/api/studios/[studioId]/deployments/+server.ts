import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { reconcileDeployment } from "$lib/server/deployment-orchestration";
import {
  createDeployment,
  isDeploymentEnvironment,
  listDeploymentsForStudio,
} from "$lib/server/surreal-deployments";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  return json({ deployments: await listDeploymentsForStudio(userId, studioId) });
};

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const body = (await event.request.json().catch(() => ({}))) as {
    releaseId?: string;
    environment?: string;
    provision?: boolean;
  };
  const environment = body.environment ?? "preview";
  if (!body.releaseId?.trim() || !isDeploymentEnvironment(environment)) {
    return json({ error: "A Release and valid environment are required" }, { status: 400 });
  }
  const result = await createDeployment({
    userId,
    studioId,
    releaseId: body.releaseId,
    environment,
  });
  if (body.provision === false || ["ready", "active"].includes(result.deployment.status)) {
    return json(result, { status: result.created ? 201 : 200 });
  }
  const reconciled = await reconcileDeployment(result.deployment, result.release);
  return json({ ...result, ...reconciled }, { status: result.created ? 201 : 200 });
};
