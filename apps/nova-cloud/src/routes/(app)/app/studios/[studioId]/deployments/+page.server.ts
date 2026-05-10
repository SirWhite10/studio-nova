import type { PageServerLoad } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getStudioForUser } from "$lib/server/surreal-studios";
import { getStudioOverviewState } from "$lib/server/studio-overview-state";

export const load: PageServerLoad = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);

  const [studio, overviewState] = await Promise.all([
    getStudioForUser(userId, studioId),
    getStudioOverviewState(userId, studioId),
  ]);

  return {
    studio,
    runtime: overviewState.runtime,
    workspaces: overviewState.workspaces,
    studioPlan: overviewState.studioPlan,
    studioId,
  };
};

export const ssr = false;
