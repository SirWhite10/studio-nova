import { json, type RequestEvent, type RequestHandler } from "@sveltejs/kit";
import {
  createPendingCustomDomain,
  createWorkspaceDomainSettings,
} from "$lib/domains/workspace-domains";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getStudioForUser } from "$lib/server/surreal-studios";

async function requireStudio(event: RequestEvent): Promise<{ studioId: string } | Response> {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId ?? "");
  const studio = await getStudioForUser(userId, studioId);
  if (!studio) {
    return json({ error: "Studio not found" }, { status: 404 });
  }
  return { studioId };
}

export const GET: RequestHandler = async (event) => {
  const access = await requireStudio(event);
  if (access instanceof Response) return access;

  return json({
    ok: true,
    domains: createWorkspaceDomainSettings(access.studioId),
    placeholder: true,
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

  return json(
    {
      ok: true,
      status: "pending",
      domain: createPendingCustomDomain(access.studioId, host),
      endpoint: "https://domains.dlxstudios.com/v1/workspaces/{workspaceId}/domains",
      placeholder: true,
    },
    { status: 202 },
  );
};
