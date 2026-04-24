import type { PageServerLoad } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { getStudioForUser } from "$lib/server/surreal-studios";
import { normalizeRouteParam } from "$lib/server/surreal-records";

export const load: PageServerLoad = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);

  const studio = await getStudioForUser(userId, studioId);

  return {
    studio,
    studioId,
    prefix: studio?.prefix ?? null,
  };
};

export const ssr = false;
