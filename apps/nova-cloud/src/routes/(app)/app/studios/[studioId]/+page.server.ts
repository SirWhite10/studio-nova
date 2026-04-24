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
  const { sandbox, runtime, primaryProcess, integrations, artifacts, runs, chats, studioPlan } =
    overviewState;

  if (!studio) {
    return {
      studio: {
        _id: studioId,
        name: "Studio",
        description: "",
        icon: "sparkles",
        color: undefined,
        isDefault: false,
      },
      chats: [],
      sandbox: null,
      runtime,
      primaryProcess,
      integrations: [],
      artifacts: [],
      runs: [],
      studioPlan: {
        plan: studioPlan?.plan ?? "free",
        label: studioPlan?.plan === "pro" ? "Pro" : "Free",
      },
    };
  }

  return {
    studio,
    chats,
    sandbox,
    runtime,
    primaryProcess,
    integrations,
    artifacts: artifacts.slice(0, 4),
    runs,
    studioPlan,
  };
};

export const ssr = false;
