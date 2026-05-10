import type { PageServerLoad } from "./$types";
import { getStudioStorageSummary } from "$lib/server/r2-files";
import { requireUserId } from "$lib/server/surreal-query";
import { getStudioForUser } from "$lib/server/surreal-studios";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getStudioOverviewState } from "$lib/server/studio-overview-state";

export const load: PageServerLoad = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);

  const [studio, storageSummary, overviewState] = await Promise.all([
    getStudioForUser(userId, studioId),
    getStudioStorageSummary(event, userId, studioId).catch(() => null),
    getStudioOverviewState(userId, studioId).catch(() => ({ workspaces: [] })),
  ]);

  return {
    studio,
    studioId,
    prefix: studio?.prefix ?? null,
    storageSummary,
    workspaces: overviewState.workspaces ?? [],
  };
};

export const ssr = false;
