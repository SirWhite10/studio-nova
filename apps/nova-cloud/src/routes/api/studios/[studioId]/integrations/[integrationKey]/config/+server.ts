import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  getIntegrationConfigSummary,
  saveIntegrationConfig,
} from "$lib/server/surreal-integration-configs";
import { requireUserId } from "$lib/server/surreal-query";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const { studioId, integrationKey } = event.params;
  const summary = await getIntegrationConfigSummary(userId, studioId, integrationKey);

  return json({ summary });
};

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const { studioId, integrationKey } = event.params;
  const body = (await event.request.json()) as { values?: Record<string, string> };

  await saveIntegrationConfig(userId, studioId, integrationKey, body.values ?? {});
  const summary = await getIntegrationConfigSummary(userId, studioId, integrationKey);

  return json({
    success: true,
    summary,
  });
};
