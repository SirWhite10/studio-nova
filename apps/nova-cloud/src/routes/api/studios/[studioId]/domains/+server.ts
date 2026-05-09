import { json, type RequestEvent, type RequestHandler } from "@sveltejs/kit";
import { addStudioCustomDomain, loadStudioDomainSettings } from "$lib/server/studio-domains";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getStudioForUser } from "$lib/server/surreal-studios";

async function requireStudio(
  event: RequestEvent,
): Promise<{ userId: string; studioId: string } | Response> {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId ?? "");
  const studio = await getStudioForUser(userId, studioId);
  if (!studio) {
    return json({ error: "Studio not found" }, { status: 404 });
  }
  return { userId, studioId };
}

export const GET: RequestHandler = async (event) => {
  const access = await requireStudio(event);
  if (access instanceof Response) return access;

  return json({
    ok: true,
    domains: await loadStudioDomainSettings(access.studioId),
  });
};

export const POST: RequestHandler = async (event) => {
  const access = await requireStudio(event);
  if (access instanceof Response) return access;

  const body = await event.request.json().catch(() => ({}));
  const host = typeof body.host === "string" ? body.host.trim().toLowerCase() : "";
  if (!host) {
    return json({ error: "host is required" }, { status: 400 });
  }

  try {
    const domain = await addStudioCustomDomain({
      userId: access.userId,
      studioId: access.studioId,
      host,
    });
    return json(
      {
        ok: true,
        status: domain.status,
        domain,
      },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 400 });
  }
};
