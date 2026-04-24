import type { Tool } from "ai";
import { z } from "zod";
import type { StudioIntegration } from "$lib/studios/types";

function summarizeIntegration(integration: StudioIntegration) {
  return {
    key: integration.key,
    title: integration.title,
    enabled: integration.enabled,
    configured: integration.configured ?? false,
    category: integration.category ?? null,
    summary: integration.summary ?? null,
    docsUrl: integration.docsUrl ?? null,
    missingFields: integration.missingFields ?? [],
  };
}

export function createStudioIntegrationsTool(integrations: StudioIntegration[]): Tool {
  return {
    description:
      "Inspect which Studio integrations are enabled, configured, and ready to use before attempting provider-specific actions.",
    inputSchema: z.object({}),
    execute: async () => {
      return {
        success: true,
        result: {
          integrations: integrations.map(summarizeIntegration),
        },
      };
    },
  };
}

function createIntegrationCapabilityTool(integration: StudioIntegration): Tool {
  return {
    description: `Inspect the configured ${integration.title} capability for this Studio and understand what actions it should support.`,
    inputSchema: z.object({}),
    execute: async () => {
      return {
        success: true,
        result: {
          integration: summarizeIntegration(integration),
          guidance: `${integration.title} is enabled and configured for this Studio. Use this capability context before taking provider-specific actions or asking the user for setup details.`,
        },
      };
    },
  };
}

export function createConfiguredIntegrationTools(integrations: StudioIntegration[]) {
  const tools: Record<string, Tool> = {};

  for (const integration of integrations) {
    if (!integration.enabled || !integration.configured) continue;
    tools[`${integration.key}_capability`] = createIntegrationCapabilityTool(integration);
  }

  return tools;
}
