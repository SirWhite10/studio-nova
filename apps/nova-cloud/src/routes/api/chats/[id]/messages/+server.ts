import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { listMessagesForChat, saveMessage } from "$lib/server/surreal-chats";
import { requireUserId } from "$lib/server/surreal-query";

export const GET: RequestHandler = async (event) => {
  const { params } = event;
  const { id } = params as { id: string };
  try {
    const messages = await listMessagesForChat(id, 100);
    return json(messages);
  } catch {
    return json({ error: "Failed to get messages" }, { status: 500 });
  }
};

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const { params, request } = event;
  const { id } = params as { id: string };
  const body: { messages: { role: string; content: string }[] } = await request.json();
  try {
    for (const msg of body.messages || []) {
      if (!msg?.content) continue;
      const role = msg.role === "assistant" ? "assistant" : "user";
      await saveMessage(id, userId, role, msg.content);
    }
    return json({ success: true });
  } catch {
    return json({ error: "Failed to save messages" }, { status: 500 });
  }
};
