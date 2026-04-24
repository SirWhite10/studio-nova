import type { IntegrationCapabilityKey } from "$lib/integrations/catalog";
import type { RuntimeStatus } from "./runtime-state";

export type StudioSummary = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  purpose?: string;
  themeHue?: number;
  isDefault?: boolean;
  chatCount: number;
  lastOpenedAt: number;
  runtimeStatus: RuntimeStatus;
  runtimeLabel: string;
  url: string;
  newChatUrl: string;
  chatPreview: {
    id: string;
    title: string;
    url: string;
  }[];
};

export type StudioIntegration = {
  id: string;
  key: IntegrationCapabilityKey;
  title: string;
  route: string;
  icon?: string;
  enabled: boolean;
  category?: string;
  summary?: string;
  docsUrl?: string;
  statusLabel?: string;
  configured?: boolean;
  missingFields?: string[];
};
