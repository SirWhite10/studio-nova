import type { PageServerLoad } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { getStudioForUser } from "$lib/server/surreal-studios";
import { getUserPlan } from "$lib/server/surreal-plans";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { loadStudioDomainSettings } from "$lib/server/studio-domains";
import {
  defaultStudioAppearanceSettings,
  defaultStudioNavigationProfile,
} from "$lib/studios/types";

export const load: PageServerLoad = async (event) => {
  const userId = requireUserId(event.locals);
  const rawStudioId = normalizeRouteParam(event.params.studioId);

  const [studioPlan, studio, domains] = await Promise.all([
    getUserPlan(userId),
    getStudioForUser(userId, rawStudioId),
    loadStudioDomainSettings(rawStudioId),
  ]);

  return {
    studioPlan,
    userId,
    domains,
    studio: studio
      ? {
          id: studio._id,
          name: studio.name,
          description: studio.description ?? "",
          themeHue: studio.themeHue,
          purpose: studio.purpose ?? "general",
          appearanceSettings:
            studio.appearanceSettings ?? defaultStudioAppearanceSettings(studio.themeHue ?? 25),
          navigationProfile: studio.navigationProfile ?? defaultStudioNavigationProfile(),
        }
      : null,
  };
};

export const ssr = false;
