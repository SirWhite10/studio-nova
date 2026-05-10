import type { PageServerLoad } from "./$types";
import { INTEGRATION_CAPABILITIES } from "$lib/integrations/catalog";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { listResolvedStudioIntegrations } from "$lib/server/surreal-integrations";
import { getStudioForUser } from "$lib/server/surreal-studios";
import type { StudioIntegration } from "$lib/studios/types";

export const load: PageServerLoad = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);

  const [studio, installedIntegrations] = await Promise.all([
    getStudioForUser(userId, studioId),
    listResolvedStudioIntegrations(userId, studioId),
  ]);

  const installedByKey = new Map<StudioIntegration["key"], StudioIntegration>(
    installedIntegrations.map((integration: StudioIntegration) => [integration.key, integration]),
  );
  const marketplace = INTEGRATION_CAPABILITIES.map((capability) => {
    const installed = installedByKey.get(capability.key);
    return {
      key: capability.key,
      title: capability.title,
      icon: capability.icon,
      category: capability.category,
      summary: capability.summary,
      docsUrl: capability.docsUrl,
      statusLabel: installed?.enabled ? "Enabled" : capability.statusLabel,
      route: `/app/studios/${studioId}/integrations/${capability.key}`,
      enabled: installed?.enabled ?? capability.defaultEnabled,
      configured: installed?.configured ?? false,
      missingFields: installed?.missingFields ?? [],
      bullets: capability.bullets,
    };
  });

  return {
    studio,
    studioId,
    marketplace,
  };
};

export const ssr = false;
