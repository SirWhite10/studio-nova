import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { deleteChat, getChat, updateChat } from "$lib/server/surreal-chats";

export const GET: RequestHandler = async (event) => {
  const { id } = event.params as { id: string };
  const chat = await getChat(id);
  if (!chat) {
    return json({ error: "Chat not found" }, { status: 404 });
  }
  return json(chat);
};

export const DELETE: RequestHandler = async (event) => {
  const { params } = event;
  const { id } = params as { id: string };
  try {
    await deleteChat(id);
    return json({ success: true });
  } catch {
    return json({ error: "Failed to delete chat" }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async (event) => {
  const { params, request } = event;
  const { id } = params as { id: string };
  const { title }: { title?: string } = await request.json();
  if (!title || !title.trim()) {
    return json({ error: "Title cannot be empty" }, { status: 400 });
  }
  try {
    const updated = await updateChat(id, { title });
    return json({ success: true, title: updated.title });
  } catch {
    return json({ error: "Failed to update chat" }, { status: 500 });
  }
};
