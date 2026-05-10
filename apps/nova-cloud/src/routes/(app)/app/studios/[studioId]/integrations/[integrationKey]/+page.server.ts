import type { PageServerLoad } from "./$types";
import { getIntegrationCapability } from "$lib/integrations/catalog";
import { buildUserAuthPackage } from "$lib/integrations/user-auth";
import { getIntegrationConfigSummary } from "$lib/server/surreal-integration-configs";
import { listResolvedStudioIntegrations } from "$lib/server/surreal-integrations";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getStudioForUser } from "$lib/server/surreal-studios";
import type { StudioIntegration } from "$lib/studios/types";

export const load: PageServerLoad = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const integrationKey = event.params.integrationKey;

  const [studio, integrations, configSummary] = await Promise.all([
    getStudioForUser(userId, studioId),
    listResolvedStudioIntegrations(userId, studioId),
    getIntegrationConfigSummary(userId, studioId, integrationKey),
  ]);

  const integration =
    integrations.find((entry: StudioIntegration) => entry.key === integrationKey) ??
    (getIntegrationCapability(integrationKey)
      ? {
          id: integrationKey,
          key: integrationKey,
          title: getIntegrationCapability(integrationKey)!.title,
          route: `/app/studios/${studioId}/integrations/${integrationKey}`,
          icon: getIntegrationCapability(integrationKey)!.icon,
          enabled: false,
          category: getIntegrationCapability(integrationKey)!.category,
          summary: getIntegrationCapability(integrationKey)!.summary,
          docsUrl: getIntegrationCapability(integrationKey)!.docsUrl,
          statusLabel: getIntegrationCapability(integrationKey)!.statusLabel,
        }
      : null);

  return {
    studio,
    studioId,
    integration,
    configSummary,
    packagedCapability:
      integrationKey === "user-auth" && configSummary
        ? buildUserAuthPackage(configSummary.fields)
        : null,
  };
};

export const ssr = false;
