import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { buildChatDebugPayload } from "$lib/server/chat-debug";
import { isSuperAdmin } from "$lib/server/super-admin";

export const GET: RequestHandler = async (event) => {
  if (!(await isSuperAdmin(event))) {
    throw error(403, "Forbidden");
  }

  const payload = await buildChatDebugPayload(event, event.params.chatId as any);
  if (!payload) {
    throw error(404, "Chat not found");
  }

  return json(payload);
};
