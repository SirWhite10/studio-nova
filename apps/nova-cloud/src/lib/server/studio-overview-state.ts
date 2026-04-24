import { listResolvedStudioIntegrations } from "$lib/server/surreal-integrations";
import { listChatsForUser } from "$lib/server/surreal-chats";
import { listRunsForStudio } from "$lib/server/surreal-chat-runs";
import { getSandboxForStudio } from "$lib/server/surreal-sandbox";
import { getPrimaryForStudio } from "$lib/server/surreal-runtime-processes";
import { listArtifactsForStudio } from "$lib/server/surreal-artifacts";
import { resolveRuntimeState } from "$lib/studios/runtime-state";
import { getUserPlan } from "$lib/server/surreal-plans";

export async function getStudioOverviewState(userId: string, studioId: string) {
  const [sandbox, primaryProcess, studioPlan, artifacts, chats, integrations, runs] =
    await Promise.all([
      getSandboxForStudio(userId, studioId).catch(() => null),
      getPrimaryForStudio(userId, studioId).catch(() => null),
      getUserPlan(userId),
      listArtifactsForStudio(userId, studioId).catch(() => []),
      listChatsForUser(userId, studioId).catch(() => []),
      listResolvedStudioIntegrations(userId, studioId).catch(() => []),
      listRunsForStudio(userId, studioId, 8).catch(() => []),
    ]);

  return {
    sandbox,
    runtime: resolveRuntimeState({ sandbox, primaryProcess }),
    primaryProcess,
    integrations,
    artifacts: artifacts.slice(0, 4),
    runs,
    chats: chats.map((chat: any) => ({
      id: chat._id,
      title: chat.title,
      url: `/app/studios/${studioId}/chat/${chat._id}`,
      updatedAt: chat.updatedAt,
    })),
    studioPlan: {
      plan: studioPlan?.plan ?? "free",
      label: studioPlan?.plan === "pro" ? "Pro" : "Free",
    },
  };
}
