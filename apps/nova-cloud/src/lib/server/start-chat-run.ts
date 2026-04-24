import { randomUUID } from "node:crypto";
import type { RequestEvent } from "@sveltejs/kit";
import { executeChatRun } from "$lib/server/chat-run-executor";
import { registerRunSession, getRunSessionSnapshot } from "$lib/server/chat-run-registry";
import { getChat, saveMessage } from "$lib/server/surreal-chats";
import {
  createChatRun,
  getActiveRunForChat,
  updateChatRunStatus,
} from "$lib/server/surreal-chat-runs";
import {
  assertStudioRunAllowed,
  getRuntimePolicyForUser,
  RuntimeLimitError,
} from "$lib/server/runtime-limits";

export type RunTrigger = "chat" | "direct" | "schedule";

export async function startChatRunForChat(input: {
  event: RequestEvent;
  userId: string;
  chatId: string;
  content: string;
  model?: string | null;
  trigger?: RunTrigger;
  triggerSource?: string | null;
}) {
  const chat = await getChat(input.chatId);
  if (!chat || chat.userId !== input.userId) {
    return { error: "Chat not found", httpStatus: 404 } as const;
  }

  const policy = await getRuntimePolicyForUser(input.userId);
  const activeRun = await getActiveRunForChat(input.userId, input.chatId, policy.maxRunDurationMs);
  if (activeRun) {
    const session = getRunSessionSnapshot(activeRun._id, activeRun.streamKey);
    if (!session || !session.attachable) {
      await updateChatRunStatus(activeRun._id, "failed", {
        error: "In-memory session lost, run was stale",
        endedAt: Date.now(),
      });
    } else {
      return {
        runId: activeRun._id,
        chatId: input.chatId,
        status: activeRun.status,
        streamKey: activeRun.streamKey,
        reused: true,
      } as const;
    }
  }

  try {
    await assertStudioRunAllowed(input.userId, chat.studioId ?? null);
  } catch (error) {
    if (error instanceof RuntimeLimitError) {
      return {
        error: error.message,
        code: error.code,
        limitReached: true,
        httpStatus: error.status,
      } as const;
    }
    throw error;
  }

  await saveMessage(input.chatId, input.userId, "user", input.content, {
    trigger: input.trigger ?? "chat",
    triggerSource: input.triggerSource ?? null,
  });

  const streamKey = randomUUID();
  const run = await createChatRun({
    userId: input.userId,
    chatId: input.chatId,
    studioId: chat.studioId ?? null,
    model: input.model || null,
    streamKey,
    status: "queued",
    liveAttachable: true,
    trigger: input.trigger ?? "chat",
    triggerSource: input.triggerSource ?? null,
  });

  registerRunSession(run._id, streamKey);

  const locals = input.event.locals;
  const platform = input.event.platform;
  setTimeout(() => {
    void executeChatRun({
      locals,
      platform,
      runId: run._id,
      streamKey,
      userId: input.userId,
      chatId: input.chatId,
      studioId: chat.studioId ?? null,
      model: input.model || null,
    }).catch((err) => {
      console.error("[start-chat-run] executeChatRun unhandled:", err);
    });
  }, 0);

  return {
    runId: run._id,
    chatId: input.chatId,
    status: run.status,
    streamKey,
    reused: false,
  } as const;
}
