import { json, type RequestHandler } from "@sveltejs/kit";

import { activateStudioDomainRoute } from "$lib/server/studio-domains";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getStudioForUser } from "$lib/server/surreal-studios";

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  if (!(await getStudioForUser(userId, studioId))) {
    return json({ error: "Studio not found" }, { status: 404 });
  }
  const body = (await event.request.json().catch(() => ({}))) as { deploymentId?: string };
  if (!body.deploymentId?.trim()) {
    return json({ error: "deploymentId is required" }, { status: 400 });
  }
  try {
    return json(
      await activateStudioDomainRoute({
        userId,
        studioId,
        host: decodeURIComponent(event.params.host ?? ""),
        deploymentId: body.deploymentId,
      }),
    );
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Route activation failed" },
      { status: 409 },
    );
  }
};
