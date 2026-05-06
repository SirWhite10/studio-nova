import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import {
  buildWorkspaceRuntimeContract,
  getWorkspaceForStudio,
  listDeploymentsForWorkspace,
} from "$lib/server/surreal-workspaces";
import { provisionWorkspaceInSandbox, startWorkspacePreview } from "$lib/server/workspace-runner";

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

  return json({
    workspace,
    deployments,
    runtimeContract: buildWorkspaceRuntimeContract(workspace, deployments[0] ?? null),
  });
};

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const workspaceId = normalizeRouteParam(event.params.workspaceId);
  const body = (await event.request.json().catch(() => ({}))) as {
    action?: "provision" | "preview";
    port?: number;
  };

  try {
    if (body.action === "preview") {
      const result = await startWorkspacePreview({
        event,
        userId,
        studioId,
        workspaceId,
        port: body.port,
      });
      return json(result);
    }

    const result = await provisionWorkspaceInSandbox({
      event,
      userId,
      studioId,
      workspaceId,
    });
    return json(result);
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
};
