import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import {
  enableStudioIntegration,
  listResolvedStudioIntegrations,
} from "$lib/server/surreal-integrations";

async function getResolvedIntegration(userId: string, studioId: string, integrationKey: string) {
  const integrations = await listResolvedStudioIntegrations(userId, studioId);
  return integrations.find((entry) => entry.key === integrationKey) ?? null;
}

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const { studioId, integrationKey } = event.params;
  const integration = await getResolvedIntegration(userId, studioId, integrationKey);

  if (!integration) {
    return json({ error: "Integration not found" }, { status: 404 });
  }

  return json({ integration });
};

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const { studioId, integrationKey } = event.params;
  await enableStudioIntegration(userId, studioId, integrationKey);
  const integration = await getResolvedIntegration(userId, studioId, integrationKey);

  return json({
    success: true,
    key: integrationKey,
    integration,
  });
};
