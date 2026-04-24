import type { PageServerLoad } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { getStudioForUser } from "$lib/server/surreal-studios";
import { getUserPlan } from "$lib/server/surreal-plans";
import { normalizeRouteParam } from "$lib/server/surreal-records";

export const load: PageServerLoad = async (event) => {
  const userId = requireUserId(event.locals);
  const rawStudioId = normalizeRouteParam(event.params.studioId);

  const [studioPlan, studio] = await Promise.all([
    getUserPlan(userId),
    getStudioForUser(userId, rawStudioId),
  ]);

  return {
    studioPlan,
    userId,
    studio: studio
      ? {
          id: studio._id,
          name: studio.name,
          description: studio.description ?? "",
          themeHue: studio.themeHue,
          purpose: studio.purpose ?? "general",
        }
      : null,
  };
};

export const ssr = false;
