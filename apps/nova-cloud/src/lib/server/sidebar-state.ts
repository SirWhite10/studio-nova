import { listResolvedStudioIntegrations } from "$lib/server/surreal-integrations";
import { listStudiosForUser } from "$lib/server/surreal-studios";
import { listChatsForUser } from "$lib/server/surreal-chats";
import { listSandboxesForUser } from "$lib/server/surreal-sandbox";
import { listPrimaryProcessesForUser } from "$lib/server/surreal-runtime-processes";
import { resolveRuntimeState } from "$lib/studios/runtime-state";
import { normalizeRouteParam } from "$lib/server/surreal-records";

export async function getSidebarState(
  userId: string,
  options?: {
    requestedStudioId?: string | null;
    persistedStudioId?: string | null;
  },
) {
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

    return {
      id: studio._id,
      name: studio.name,
      description: studio.description,
      icon: studio.icon || "sparkles",
      color: studio.color,
      purpose: studio.purpose || "general",
      themeHue: studio.themeHue ?? 25,
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

  return {
    user: {
      name: "Nova User",
      email: "studio@nova.app",
      avatar: "/avatars/shadcn.jpg",
    },
    studios: studioSummaries,
    currentStudio: currentStudioSummary,
    integrations: integrations
      .filter((integration: any) => integration.enabled)
      .map((integration: any) => ({
        id: integration._id,
        key: integration.key,
        title: integration.title,
        route: integration.route,
        icon: integration.icon,
        enabled: integration.enabled,
      })),
    navSecondary: [
      { title: "Support", url: "#", icon: null },
      { title: "Feedback", url: "#", icon: null },
    ],
  };
}
