import type { PageServerLoad } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { getStudioForUser } from "$lib/server/surreal-studios";
import { getSandboxForStudio } from "$lib/server/surreal-sandbox";
import { getPrimaryForStudio } from "$lib/server/surreal-runtime-processes";
import { listArtifactsForStudio } from "$lib/server/surreal-artifacts";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { resolveRuntimeState } from "$lib/studios/runtime-state";

export const load: PageServerLoad = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);

  const [studio, sandbox, primaryProcess, artifacts] = await Promise.all([
    getStudioForUser(userId, studioId),
    getSandboxForStudio(userId, studioId).catch(() => null),
    getPrimaryForStudio(userId, studioId).catch(() => null),
    listArtifactsForStudio(userId, studioId, ["preview"]).catch(() => []),
  ]);
  const runtime = resolveRuntimeState({ sandbox, primaryProcess });

  return {
    studio,
    sandbox,
    primaryProcess,
    artifacts,
    runtime,
    studioId,
  };
};

export const ssr = false;
