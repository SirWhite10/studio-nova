import type { PageServerLoad } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { getStudioForUser } from "$lib/server/surreal-studios";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getStudioRuntimeSnapshot } from "$lib/server/runtime-control-state";
import { getStudioOverviewState } from "$lib/server/studio-overview-state";

export const load: PageServerLoad = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);

  const [studio, snapshot, overviewState] = await Promise.all([
    getStudioForUser(userId, studioId),
    getStudioRuntimeSnapshot(userId, studioId),
    getStudioOverviewState(userId, studioId),
  ]);

  return {
    studio,
    sandbox: snapshot.sandboxLike,
    primaryProcess: snapshot.primaryProcess,
    artifacts: snapshot.artifacts,
    runtime: snapshot.runtime,
    workspaces: overviewState.workspaces,
    studioId,
  };
};

export const ssr = false;
