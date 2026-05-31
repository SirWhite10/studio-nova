import type { PageServerLoad } from "./$types";
import { getStudioStorageSummary } from "$lib/server/r2-files";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getStudioForUser } from "$lib/server/surreal-studios";

export const load: PageServerLoad = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);

  const [studio, storageSummary] = await Promise.all([
    getStudioForUser(userId, studioId),
    getStudioStorageSummary(event, userId, studioId).catch(() => null),
  ]);

  return {
    studio,
    studioId,
    storageSummary,
  };
};

export const ssr = false;
