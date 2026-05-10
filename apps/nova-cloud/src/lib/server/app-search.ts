import { listChatsForUser } from "$lib/server/surreal-chats";
import { listResolvedStudioIntegrations } from "$lib/server/surreal-integrations";
import { listStudiosForUser } from "$lib/server/surreal-studios";
import { listWorkspacesForStudio } from "$lib/server/surreal-workspaces";
import type { StudioShellSearchResult } from "$lib/studios/types";

function includesQuery(value: string | undefined | null, query: string) {
  return value?.toLowerCase().includes(query) ?? false;
}

export async function searchAppShell(input: {
  userId: string;
  query: string;
  selectedStudioId?: string | null;
  limit?: number;
}) {
  const query = input.query.trim().toLowerCase();
  if (!query) {
    return {
      query: input.query,
      results: [] as StudioShellSearchResult[],
    };
  }

  const [studios, chats] = await Promise.all([
    listStudiosForUser(input.userId),
    listChatsForUser(input.userId),
  ]);

  const results: StudioShellSearchResult[] = [];

  for (const studio of studios as any[]) {
    if (includesQuery(studio.name, query) || includesQuery(studio.description, query)) {
      results.push({
        id: `studio:${studio._id}`,
        type: "studio",
        title: studio.name,
        subtitle: studio.description || "Studio",
        href: `/app/studios/${studio._id}`,
        section: "Studios",
        studioId: studio._id,
        priority: studio._id === input.selectedStudioId ? 10 : 30,
      });
    }
  }

  for (const chat of chats as any[]) {
    if (includesQuery(chat.title, query)) {
      results.push({
        id: `chat:${chat._id}`,
        type: "chat",
        title: chat.title,
        subtitle: "Studio conversation",
        href: `/app/studios/${chat.studioId}/chat/${chat._id}`,
        section: "Chats",
        studioId: chat.studioId,
        priority: chat.studioId === input.selectedStudioId ? 20 : 40,
      });
    }
  }

  if (input.selectedStudioId) {
    const [integrations, workspaces] = await Promise.all([
      listResolvedStudioIntegrations(input.userId, input.selectedStudioId).catch(() => []),
      listWorkspacesForStudio(input.userId, input.selectedStudioId).catch(() => []),
    ]);

    const studioPages: StudioShellSearchResult[] = [
      {
        id: `page:${input.selectedStudioId}:agents`,
        type: "page",
        title: "Agents",
        subtitle: "Manage agent harnesses and execution surfaces",
        href: `/app/studios/${input.selectedStudioId}/agents`,
        section: "Agent",
        studioId: input.selectedStudioId,
        priority: 12,
      },
      {
        id: `page:${input.selectedStudioId}:memory`,
        type: "page",
        title: "Memory",
        subtitle: "Search long-term memory for this workspace",
        href: `/app/studios/${input.selectedStudioId}/memory`,
        section: "Agent",
        studioId: input.selectedStudioId,
        priority: 13,
      },
      {
        id: `page:${input.selectedStudioId}:marketplace`,
        type: "page",
        title: "Marketplace",
        subtitle: "Browse extensions and integrations for this Studio",
        href: `/app/studios/${input.selectedStudioId}/marketplace`,
        section: "Integrations",
        studioId: input.selectedStudioId,
        priority: 16,
      },
      {
        id: `page:${input.selectedStudioId}:files`,
        type: "page",
        title: "Files",
        subtitle: "Manage persistent Studio content files",
        href: `/app/studios/${input.selectedStudioId}/files`,
        section: "Content",
        studioId: input.selectedStudioId,
        priority: 17,
      },
      {
        id: `page:${input.selectedStudioId}:collections`,
        type: "page",
        title: "Collections",
        subtitle: "Structure CMS-style content collections for this Studio",
        href: `/app/studios/${input.selectedStudioId}/collections`,
        section: "Content",
        studioId: input.selectedStudioId,
        priority: 18,
      },
      {
        id: `page:${input.selectedStudioId}:media`,
        type: "page",
        title: "Media",
        subtitle: "Review reusable uploaded assets and storage health",
        href: `/app/studios/${input.selectedStudioId}/media`,
        section: "Content",
        studioId: input.selectedStudioId,
        priority: 19,
      },
      {
        id: `page:${input.selectedStudioId}:sandbox`,
        type: "page",
        title: "Sandbox",
        subtitle: "Control the live Studio runtime and package surface",
        href: `/app/studios/${input.selectedStudioId}/sandbox`,
        section: "Workspace & Sandbox",
        studioId: input.selectedStudioId,
        priority: 20,
      },
    ];

    for (const pageResult of studioPages) {
      if (includesQuery(pageResult.title, query) || includesQuery(pageResult.subtitle, query)) {
        results.push(pageResult);
      }
    }

    for (const integration of integrations) {
      if (includesQuery(integration.title, query) || includesQuery(integration.summary, query)) {
        results.push({
          id: `integration:${integration.id}`,
          type: "integration",
          title: integration.title,
          subtitle: integration.summary || "Installed integration",
          href: integration.route,
          section: "Integrations",
          studioId: input.selectedStudioId,
          priority: 15,
        });
      }
    }

    for (const workspace of workspaces as any[]) {
      if (includesQuery(workspace.name, query) || includesQuery(workspace.slug, query)) {
        results.push({
          id: `workspace:${workspace._id}`,
          type: "workspace",
          title: workspace.name,
          subtitle: "Deployment workspace",
          href: `/app/studios/${input.selectedStudioId}/deployments`,
          section: "Deployments",
          studioId: input.selectedStudioId,
          priority: 25,
        });
      }
    }
  }

  results.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title));

  return {
    query: input.query,
    results: results.slice(0, input.limit ?? 12),
  };
}
