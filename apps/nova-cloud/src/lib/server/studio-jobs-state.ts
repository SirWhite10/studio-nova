import { listChatsForUser } from "$lib/server/surreal-chats";
import { listRunsForStudio } from "$lib/server/surreal-chat-runs";
import { listScheduledJobsForStudio } from "$lib/server/surreal-scheduled-jobs";

export async function getStudioJobsState(userId: string, studioId: string) {
  const [jobs, runs, chats] = await Promise.all([
    listScheduledJobsForStudio(userId, studioId).catch(() => []),
    listRunsForStudio(userId, studioId, 20).catch(() => []),
    listChatsForUser(userId, studioId).catch(() => []),
  ]);

  return {
    jobs,
    runs: runs.filter((run) => run.trigger === "schedule").slice(0, 8),
    chats: chats.map((chat) => ({
      id: chat._id,
      title: chat.title,
      url: `/app/studios/${studioId}/chat/${chat._id}`,
    })),
  };
}
