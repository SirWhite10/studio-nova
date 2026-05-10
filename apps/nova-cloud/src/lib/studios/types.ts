import type { IntegrationCapabilityKey } from "$lib/integrations/catalog";
import type { RuntimeStatus } from "./runtime-state";

export const STUDIO_SIDEBAR_SECTION_IDS = [
  "agent",
  "workspace-sandbox",
  "integrations",
  "content",
] as const;

export type StudioSidebarSectionId = (typeof STUDIO_SIDEBAR_SECTION_IDS)[number];
export const STUDIO_CONTENT_INCLUDED_BYTES = 2 * 1024 * 1024 * 1024;

export type StudioAppearanceAccentScale = "subtle" | "balanced" | "vivid";
export type StudioAppearanceSurfaceMode = "system" | "obsidian" | "champagne";
export type StudioAppearanceBrandContrast = "soft" | "balanced" | "high";

export type StudioAppearanceSettings = {
  themeHue: number;
  accentScale: StudioAppearanceAccentScale;
  surfaceMode: StudioAppearanceSurfaceMode;
  brandContrast: StudioAppearanceBrandContrast;
};

export type StudioNavigationSectionConfig = {
  itemOrder: string[];
  collapsed?: boolean;
};

export type StudioNavigationProfile = {
  version: number;
  sectionOrder: StudioSidebarSectionId[];
  sectionConfigs: Partial<Record<StudioSidebarSectionId, StudioNavigationSectionConfig>>;
};

export function defaultStudioAppearanceSettings(themeHue = 25): StudioAppearanceSettings {
  return {
    themeHue,
    accentScale: "balanced",
    surfaceMode: "obsidian",
    brandContrast: "balanced",
  };
}

export function defaultStudioNavigationProfile(): StudioNavigationProfile {
  return {
    version: 1,
    sectionOrder: [...STUDIO_SIDEBAR_SECTION_IDS],
    sectionConfigs: {
      agent: { itemOrder: ["overview", "chats", "skills", "agents", "memory", "jobs"] },
      "workspace-sandbox": { itemOrder: ["deployments", "sandbox"] },
      integrations: { itemOrder: [] },
      content: { itemOrder: ["files", "collections", "media"] },
    },
  };
}

export type StudioContentAllocationSummary = {
  includedBytes: number;
  usedBytes: number;
  remainingBytes: number;
  displayLabel: string;
  usedLabel: string;
  remainingLabel: string;
  percentUsed: number;
  fileCount: number;
  folderCount: number;
  latestUploadAt: string | null;
};

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
  appearanceSettings?: StudioAppearanceSettings;
  navigationProfile?: StudioNavigationProfile;
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

export type StudioSidebarUser = {
  name: string;
  email: string;
  avatar?: string;
};

export type StudioSidebarLink = {
  id: string;
  title: string;
  href: string;
  icon?: string;
};

export type StudioSidebarSectionAction = {
  id: string;
  title: string;
  href: string;
  icon?: string;
};

export type StudioSidebarItemChild = {
  id: string;
  title: string;
  href: string;
  icon?: string;
};

export type StudioSidebarItem = {
  id: string;
  title: string;
  href: string;
  icon?: string;
  badge?: string;
  reorderable?: boolean;
  children?: StudioSidebarItemChild[];
};

export type StudioSidebarSection = {
  id: StudioSidebarSectionId;
  title: string;
  icon?: string;
  reorderable: boolean;
  items: StudioSidebarItem[];
  action?: StudioSidebarSectionAction;
  emptyLabel?: string;
};

export type StudioSidebarNavigation = {
  version: number;
  sectionOrder: StudioSidebarSectionId[];
  sections: StudioSidebarSection[];
};

export type StudioSidebarSearchConfig = {
  enabled: boolean;
  placeholder: string;
};

export type StudioSidebarState = {
  user: StudioSidebarUser;
  studios: StudioSummary[];
  currentStudio: StudioSummary | null;
  navigation: StudioSidebarNavigation;
  footerLinks: StudioSidebarLink[];
  search: StudioSidebarSearchConfig;
};

export type StudioShellSearchResultType = "studio" | "chat" | "integration" | "workspace" | "page";

export type StudioShellSearchResult = {
  id: string;
  type: StudioShellSearchResultType;
  title: string;
  subtitle: string;
  href: string;
  section: string;
  studioId?: string;
  priority: number;
};
