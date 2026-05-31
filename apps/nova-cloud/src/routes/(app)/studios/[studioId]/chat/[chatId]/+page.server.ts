import type { PageServerLoad } from "./$types";
import { toUIMessages } from "$lib/nova/chat/message-parts";
import { isSuperAdmin } from "$lib/server/super-admin";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getChat, listMessagesForChat } from "$lib/server/surreal-chats";
import { getActiveRunForChat } from "$lib/server/surreal-chat-runs";

export const load: PageServerLoad = async (event) => {
  const rawStudioId = normalizeRouteParam(event.params.studioId);
  const rawChatId = normalizeRouteParam(event.params.chatId);
  const canInspectAgentContext = await isSuperAdmin(event);
  if (!rawChatId || rawChatId === "undefined") {
    return {
      initialMessages: [],
      chatId: "",
      chatTitle: "Chat",
      userId: "anonymous",
      activeRun: null,
      studioId: rawStudioId,
      canInspectAgentContext,
      invalidChat: true,
    };
  }

  const userId = requireUserId(event.locals);
  const [chat, messages, activeRun] = await Promise.all([
    getChat(rawChatId),
    listMessagesForChat(rawChatId, 100),
    getActiveRunForChat(userId, rawChatId),
  ]);

  return {
    initialMessages: toUIMessages(messages),
    chatId: rawChatId,
    chatTitle: chat?.title || "Chat",
    userId,
    activeRun,
    studioId: rawStudioId,
    canInspectAgentContext,
  };
};

export const ssr = false;
