import type { PageServerLoad } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getStudioForUser } from "$lib/server/surreal-studios";
import { listWorkspacesForStudio } from "$lib/server/surreal-workspaces";
import {
  getRuntimeControlHealth,
  getRuntimeControlStatus,
  runtimeControlConfigured,
  runtimeControlStudioId,
} from "$lib/server/nova-runtime-control";

export const load: PageServerLoad = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const [studio, workspaces] = await Promise.all([
    getStudioForUser(userId, studioId),
    listWorkspacesForStudio(userId, studioId).catch(() => []),
  ]);
  const controlStudioId = runtimeControlStudioId(userId, studio?._id ?? studioId);

  const [health, status] = await Promise.all([
    getRuntimeControlHealth().catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })),
    getRuntimeControlStatus(controlStudioId).catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })),
  ]);

  return {
    studio,
    studioId,
    workspaces,
    controlStudioId,
    configured: runtimeControlConfigured(),
    health,
    status,
  };
};

export const ssr = false;
