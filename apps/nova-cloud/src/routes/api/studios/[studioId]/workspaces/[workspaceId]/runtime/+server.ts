import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import {
  buildWorkspaceRuntimeContract,
  getWorkspaceForStudio,
  listDeploymentsForWorkspace,
} from "$lib/server/surreal-workspaces";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const workspaceId = normalizeRouteParam(event.params.workspaceId);

  const [workspace, deployments] = await Promise.all([
    getWorkspaceForStudio(userId, studioId, workspaceId),
    listDeploymentsForWorkspace(userId, studioId, workspaceId),
  ]);

  if (!workspace) {
    return json({ error: "Workspace not found" }, { status: 404 });
  }

  const deployment = deployments[0] ?? null;
  const runtimeContract = buildWorkspaceRuntimeContract(workspace, deployment);

  return json({
    workspace,
    deployment,
    runtimeContract,
  });
};
