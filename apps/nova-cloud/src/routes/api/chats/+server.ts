import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { createChat, listChatsForUser } from "$lib/server/surreal-chats";
import { requireUserId } from "$lib/server/surreal-query";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const chats = await listChatsForUser(userId);
  return json(chats);
};

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const { request } = event;
  const { title, studioId }: { title?: string; studioId?: string } = await request.json();
  if (!studioId) {
    return json({ error: "studioId is required" }, { status: 400 });
  }
  const chat = await createChat(userId, studioId, title);
  return json({ id: chat._id });
};
