import { json, type RequestHandler } from "@sveltejs/kit";
import { verifyStudioCustomDomain } from "$lib/server/studio-domains";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getStudioForUser } from "$lib/server/surreal-studios";

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId ?? "");
  const studio = await getStudioForUser(userId, studioId);
  if (!studio) {
    return json({ error: "Studio not found" }, { status: 404 });
  }

  const host = decodeURIComponent(event.params.host ?? "");
  try {
    return json(await verifyStudioCustomDomain(studioId, host), { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 400 });
  }
};
