import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getStudioJobsState } from "$lib/server/studio-jobs-state";
import { getStudioForUser } from "$lib/server/surreal-studios";

export const load: PageServerLoad = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const [studio, jobsState] = await Promise.all([
    getStudioForUser(userId, studioId),
    getStudioJobsState(userId, studioId),
  ]);

  if (!studio) {
    throw error(404, "Studio not found");
  }

  return {
    studio,
    ...jobsState,
  };
};

export const ssr = false;
