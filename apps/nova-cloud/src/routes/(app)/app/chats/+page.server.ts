import type { PageServerLoad } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { listStudiosForUser } from "$lib/server/surreal-studios";
import { listChatsForUser } from "$lib/server/surreal-chats";

export const load: PageServerLoad = async (event) => {
  const userId = requireUserId(event.locals);
  const studios = await listStudiosForUser(userId);
  const fallbackStudioId = studios[0]?._id ?? null;
  const currentStudioId = event.url.searchParams.get("studio") ?? fallbackStudioId ?? null;

  const chats = await listChatsForUser(userId);
  return {
    currentStudioId,
    chats: chats.map((chat: any) => ({
      id: chat._id,
      title: chat.title,
      description: "Last updated: " + new Date(chat.updatedAt).toLocaleDateString(),
      imageUrl: `https://placehold.co/400x300?text=${encodeURIComponent(chat.title)}`,
      url: `/app/studios/${chat.studioId}/chat/${chat._id}`,
    })),
  };
};

export const ssr = false;
