import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { startChatRunForChat } from "$lib/server/start-chat-run";

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const body = (await event.request.json()) as {
    chatId?: string;
    content?: string;
    model?: string;
  };

  const chatId = body.chatId?.trim();
  const content = body.content?.trim();

  if (!chatId || !content) {
    return json({ error: "chatId and content are required" }, { status: 400 });
  }

  const run = await startChatRunForChat({
    event,
    userId,
    chatId,
    content,
    model: body.model || null,
  });

  if ("error" in run) {
    return json(run, { status: run.httpStatus });
  }

  return json({
    runId: run.runId,
    status: run.status,
    streamKey: run.streamKey,
    reused: run.reused,
  });
};
