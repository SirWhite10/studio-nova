import { json, type RequestHandler } from "@sveltejs/kit";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getStudioForUser } from "$lib/server/surreal-studios";

export const DELETE: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId ?? "");
  const studio = await getStudioForUser(userId, studioId);
  if (!studio) {
    return json({ error: "Studio not found" }, { status: 404 });
  }

  return json({
    ok: true,
    host: decodeURIComponent(event.params.host ?? ""),
    status: "remove-requested",
    endpoint: "https://domains.dlxstudios.com/v1/workspaces/{workspaceId}/domains/{host}",
    placeholder: true,
  });
};
