import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createChat } from "$lib/server/surreal-chats";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getStudioForUser } from "$lib/server/surreal-studios";
import { startChatRunForChat, type RunTrigger } from "$lib/server/start-chat-run";

function makeJobTitle(trigger: RunTrigger, content: string) {
  const prefix = trigger === "schedule" ? "Scheduled job" : "Direct task";
  const summary = content.replace(/\s+/g, " ").trim().slice(0, 60);
  return summary ? `${prefix}: ${summary}` : prefix;
}

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const body = (await event.request.json()) as {
    content?: string;
    trigger?: RunTrigger;
    triggerSource?: string;
    model?: string;
  };

  const content = body.content?.trim();
  const trigger = body.trigger === "schedule" ? "schedule" : "direct";

  if (!content) {
    return json({ error: "content is required" }, { status: 400 });
  }

  const studio = await getStudioForUser(userId, studioId);
  if (!studio) {
    return json({ error: "Studio not found" }, { status: 404 });
  }

  const chat = await createChat(userId, studioId, makeJobTitle(trigger, content));
  const run = await startChatRunForChat({
    event,
    userId,
    chatId: chat._id,
    content,
    model: body.model || null,
    trigger,
    triggerSource:
      body.triggerSource?.trim() || (trigger === "schedule" ? "manual-schedule" : "studio-direct"),
  });

  if ("error" in run) {
    return json(run, { status: run.httpStatus });
  }

  return json({
    ...run,
    trigger,
    chatId: chat._id,
    chatTitle: chat.title,
  });
};
