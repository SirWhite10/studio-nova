import { listResolvedStudioIntegrations } from "$lib/server/surreal-integrations";
import { listStudiosForUser } from "$lib/server/surreal-studios";
import { listChatsForUser } from "$lib/server/surreal-chats";
import { listSandboxesForUser } from "$lib/server/surreal-sandbox";
import { listPrimaryProcessesForUser } from "$lib/server/surreal-runtime-processes";
import { resolveRuntimeState } from "$lib/studios/runtime-state";
import {
  STUDIO_SIDEBAR_SECTION_IDS,
  defaultStudioAppearanceSettings,
  defaultStudioNavigationProfile,
  type StudioNavigationProfile,
  type StudioSidebarItem,
  type StudioSidebarNavigation,
  type StudioSidebarSection,
  type StudioSidebarSectionId,
  type StudioSidebarState,
} from "$lib/studios/types";
import { normalizeRouteParam } from "$lib/server/surreal-records";

const CONTENT_FREE_STORAGE_BADGE = "2 GB free";

type SidebarStateOptions = {
  requestedStudioId?: string | null;
  persistedStudioId?: string | null;
  userProfile?: {
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
  };
};

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function normalizeNavigationProfile(
  profile?: StudioNavigationProfile | null,
): StudioNavigationProfile {
  const defaults = defaultStudioNavigationProfile();
  const sectionOrder = uniqueStrings(
    [...(profile?.sectionOrder ?? []), ...defaults.sectionOrder].filter(
      (id): id is StudioSidebarSectionId =>
        STUDIO_SIDEBAR_SECTION_IDS.includes(id as StudioSidebarSectionId),
    ),
  ) as StudioSidebarSectionId[];

  const sectionConfigs = {
    ...defaults.sectionConfigs,
  } as StudioNavigationProfile["sectionConfigs"];
  for (const sectionId of STUDIO_SIDEBAR_SECTION_IDS) {
    const candidate = profile?.sectionConfigs?.[sectionId];
    if (!candidate) continue;
    sectionConfigs[sectionId] = {
      itemOrder: uniqueStrings(candidate.itemOrder ?? []),
      collapsed: candidate.collapsed ?? false,
    };
  }

  return {
    version: profile?.version ?? defaults.version,
    sectionOrder,
    sectionConfigs,
  };
}

function orderItems(
  items: StudioSidebarItem[],
  itemOrder: string[] | undefined,
): StudioSidebarItem[] {
  if (!itemOrder?.length) return items;
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const ordered: StudioSidebarItem[] = [];

  for (const itemId of itemOrder) {
    const item = itemMap.get(itemId);
    if (!item) continue;
    ordered.push(item);
    itemMap.delete(itemId);
  }

  for (const item of items) {
    if (itemMap.has(item.id)) ordered.push(item);
  }

  return ordered;
}

function buildNavigation(
  currentStudio: StudioSidebarState["currentStudio"],
  integrations: StudioSidebarState["currentStudio"] extends never ? never : any[],
): StudioSidebarNavigation {
  const profile = normalizeNavigationProfile(currentStudio?.navigationProfile);

  if (!currentStudio) {
    return {
      version: profile.version,
      sectionOrder: profile.sectionOrder,
      sections: [
        {
          id: "agent",
          title: "Agent",
          icon: "sparkles",
          reorderable: true,
          items: [
            {
              id: "get-started",
              title: "Create your first Studio",
              href: "/app",
              icon: "sparkles",
            },
          ],
        },
      ],
    };
  }

  const studioBase = currentStudio.url;
  const primaryAgentId = `agent-${currentStudio.id}`;
  const agentItems = orderItems(
    [
      {
        id: "overview",
        title: "Overview",
        href: `${studioBase}/agents`,
        icon: "waypoints",
        reorderable: true,
      },
      {
        id: "primary-agent",
        title: "Primary Agent",
        icon: "bot",
        reorderable: true,
        href: `${studioBase}/agents/${primaryAgentId}`,
        manageKind: "agent",
        children: [
          {
            id: `${primaryAgentId}-chats`,
            title: "Chats",
            href: `/app/chats?studio=${currentStudio.id}`,
            icon: "message-square",
            children: currentStudio.chatPreview.map((chat) => ({
              id: `chat-${chat.id}`,
              title: chat.title,
              href: chat.url,
              icon: "message-square",
            })),
          },
          {
            id: `${primaryAgentId}-skills`,
            title: "Skills",
            href: `${studioBase}/skills`,
            icon: "sparkles",
          },
          {
            id: `${primaryAgentId}-memory`,
            title: "Memory",
            href: `${studioBase}/memory`,
            icon: "brain",
          },
          {
            id: `${primaryAgentId}-jobs`,
            title: "Jobs",
            href: `${studioBase}/jobs`,
            icon: "calendar-clock",
          },
        ],
      },
    ],
    profile.sectionConfigs.agent?.itemOrder,
  );

  const workspaceItems = orderItems(
    [
      {
        id: "deployments",
        title: "Deployments",
        href: `${studioBase}/deployments`,
        icon: "blocks",
        reorderable: true,
      },
      {
        id: "sandbox",
        title: "Sandbox",
        href: `${studioBase}/sandbox`,
        icon: "wrench",
        reorderable: true,
      },
    ],
    profile.sectionConfigs["workspace-sandbox"]?.itemOrder,
  );

  const integrationItems = orderItems(
    [
      {
        id: "overview",
        title: "Overview",
        href: `${studioBase}/marketplace`,
        icon: "waypoints",
        reorderable: true,
      },
      ...integrations
        .filter((integration) => integration.enabled)
        .map((integration) => ({
          id: integration.key,
          title: integration.title,
          href: integration.route,
          icon: integration.icon ?? "blocks",
          reorderable: true,
          manageKind: "integration" as const,
        })),
    ],
    profile.sectionConfigs.integrations?.itemOrder,
  );

  const contentItems = orderItems(
    [
      {
        id: "files",
        title: "Files",
        href: `${studioBase}/files`,
        icon: "folder",
        badge: CONTENT_FREE_STORAGE_BADGE,
        reorderable: true,
      },
      {
        id: "collections",
        title: "Collections",
        href: `${studioBase}/collections`,
        icon: "layers",
        reorderable: true,
      },
      {
        id: "media",
        title: "Media",
        href: `${studioBase}/media`,
        icon: "image",
        reorderable: true,
      },
    ],
    profile.sectionConfigs.content?.itemOrder,
  );

  const sectionsById: Record<StudioSidebarSectionId, StudioSidebarSection> = {
    agent: {
      id: "agent",
      title: "Agents",
      icon: "bot",
      reorderable: true,
      items: agentItems,
      action: {
        id: "agents-add",
        title: "Add Agent",
        href: `${studioBase}/agents`,
        icon: "plus",
      },
    },
    "workspace-sandbox": {
      id: "workspace-sandbox",
      title: "Workspace & Sandbox",
      icon: "blocks",
      reorderable: true,
      items: workspaceItems,
    },
    integrations: {
      id: "integrations",
      title: "Integrations",
      icon: "plug-zap",
      reorderable: true,
      items: integrationItems,
      action: {
        id: "marketplace",
        title: "Open Marketplace",
        href: `${studioBase}/marketplace`,
        icon: "plus",
      },
      emptyLabel: "No integrations installed yet.",
    },
    content: {
      id: "content",
      title: "Content",
      icon: "folder",
      reorderable: true,
      items: contentItems,
    },
  };

  return {
    version: profile.version,
    sectionOrder: profile.sectionOrder,
    sections: profile.sectionOrder.map((sectionId) => sectionsById[sectionId]).filter(Boolean),
  };
}

export async function getSidebarState(
  userId: string,
  options?: SidebarStateOptions,
): Promise<StudioSidebarState> {
  const [studios, chats, sandboxes, primaryProcesses] = await Promise.all([
    listStudiosForUser(userId),
    listChatsForUser(userId),
    listSandboxesForUser(userId).catch(() => []),
    listPrimaryProcessesForUser(userId).catch(() => []),
  ]);

  const selectedStudioId =
    (options?.requestedStudioId ? normalizeRouteParam(options.requestedStudioId) : null) ??
    (options?.persistedStudioId ? normalizeRouteParam(options.persistedStudioId) : null) ??
    studios[0]?._id ??
    null;

  const currentStudio =
    studios.find((studio) => studio._id === selectedStudioId) ?? studios[0] ?? null;

  const chatMap = new Map<string, { id: string; title: string; updatedAt: number }[]>();
  for (const chat of chats as any[]) {
    const sid = chat.studioId || "";
    const list = chatMap.get(sid) ?? [];
    list.push({ id: chat._id, title: chat.title, updatedAt: chat.updatedAt });
    chatMap.set(sid, list);
  }

  const sandboxMap = new Map(sandboxes.map((sandbox: any) => [sandbox.studioId ?? "", sandbox]));
  const primaryProcessMap = new Map(
    primaryProcesses.map((process: any) => [process.studioId ?? "", process]),
  );

  const studioSummaries = studios.map((studio: any, index: number) => {
    const studioChats = chatMap.get(studio._id) ?? [];
    const runtime = resolveRuntimeState({
      sandbox: sandboxMap.get(studio._id) ?? null,
      primaryProcess: primaryProcessMap.get(studio._id) ?? null,
    });
    const chatPreview = studioChats.slice(0, 3).map((chat) => ({
      id: chat.id,
      title: chat.title,
      url: `/app/studios/${studio._id}/chat/${chat.id}`,
    }));
    const appearanceSettings =
      studio.appearanceSettings ?? defaultStudioAppearanceSettings(studio.themeHue ?? 25);

    return {
      id: studio._id,
      name: studio.name,
      description: studio.description,
      icon: studio.icon || "sparkles",
      color: studio.color,
      purpose: studio.purpose || "general",
      themeHue: studio.themeHue ?? appearanceSettings.themeHue ?? 25,
      appearanceSettings,
      navigationProfile: normalizeNavigationProfile(studio.navigationProfile),
      isDefault: studio.isDefault ?? index === 0,
      chatCount: studioChats.length,
      lastOpenedAt: studio.lastOpenedAt ?? studio.updatedAt ?? Date.now(),
      runtimeStatus: runtime.status,
      runtimeLabel: runtime.label,
      url: `/app/studios/${studio._id}`,
      newChatUrl: `/app/studios/${studio._id}`,
      chatPreview,
    };
  });

  const currentStudioSummary =
    studioSummaries.find((studio: any) => studio.id === currentStudio?._id) ??
    studioSummaries[0] ??
    null;

  const integrations = currentStudio?._id
    ? await listResolvedStudioIntegrations(userId, currentStudio._id)
    : [];

  const userName =
    options?.userProfile?.name?.trim() || options?.userProfile?.email?.split("@")[0] || "Nova User";
  const userEmail = options?.userProfile?.email?.trim() || "studio@nova.app";

  return {
    user: {
      name: userName,
      email: userEmail,
      avatar: options?.userProfile?.avatar?.trim() || "",
    },
    studios: studioSummaries,
    currentStudio: currentStudioSummary,
    navigation: buildNavigation(currentStudioSummary, integrations),
    footerLinks: currentStudioSummary
      ? [
          {
            id: "settings",
            title: "Settings",
            href: `${currentStudioSummary.url}/settings`,
            icon: "settings-2",
          },
          {
            id: "support",
            title: "Support",
            href: "mailto:support@nova.app",
            icon: "life-buoy",
          },
        ]
      : [],
    search: {
      enabled: true,
      placeholder: "Search Nova",
    },
  };
}

export { normalizeNavigationProfile };
