import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { stepCountIs, streamText } from "ai";
import { createAgentTools } from "$lib/agent/tools";
import { listMessagesForChat, saveMessage } from "$lib/server/surreal-chats";
import { publishRunChunk, failRunSession, completeRunSession } from "$lib/server/chat-run-registry";
import { updateChatRunStatus } from "$lib/server/surreal-chat-runs";
import { OPENROUTER_API_KEY } from "$env/static/private";
import { getRuntimePolicyForUser } from "$lib/server/runtime-limits";

const DEFAULT_MODEL = "stepfun/step-3.5-flash";

type PersistedPart =
  | { type: "text"; text: string }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      input: unknown;
    }
  | {
      type: "tool-result";
      toolCallId: string;
      toolName: string;
      output: unknown;
    };

function flushTextPart(parts: PersistedPart[], bufferedText: string) {
  if (!bufferedText) return "";
  parts.push({ type: "text", text: bufferedText });
  return "";
}

function sanitizePersistedParts(parts: PersistedPart[]) {
  const resultIds = new Set(
    parts
      .filter((part) => part.type === "tool-result")
      .map((part) => (part as { toolCallId: string }).toolCallId),
  );

  return parts.filter((part) => part.type !== "tool-call" || resultIds.has(part.toolCallId));
}

function buildModelMessages(messages: any[]) {
  const result: any[] = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      result.push({ role: "user", content: msg.content });
      continue;
    }

    if (msg.role === "assistant") {
      const parts: any[] = msg.parts;
      if (!parts || !parts.length) {
        result.push({ role: "assistant", content: msg.content });
        continue;
      }

      const assistantContent: any[] = [];
      const toolResults: any[] = [];
      const resultIds = new Set(
        parts.filter((part) => part.type === "tool-result").map((part) => String(part.toolCallId)),
      );

      for (const part of parts) {
        if (part.type === "text") {
          assistantContent.push({ type: "text", text: part.text });
        } else if (part.type === "tool-call") {
          if (!resultIds.has(String(part.toolCallId))) continue;
          assistantContent.push({
            type: "tool-call",
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            input: part.input,
          });
        } else if (part.type === "tool-result") {
          const raw = part.output;
          const wrapped =
            typeof raw === "string"
              ? { type: "text" as const, value: raw }
              : { type: "json" as const, value: raw };
          toolResults.push({
            type: "tool-result",
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            output: wrapped,
          });
        }
      }

      result.push({ role: "assistant", content: assistantContent });
      if (toolResults.length > 0) {
        result.push({ role: "tool", content: toolResults });
      }
      continue;
    }
  }

  return result;
}

export async function executeChatRun(params: {
  locals: App.Locals;
  platform?: App.Platform;
  runId: string;
  streamKey: string;
  userId: string;
  chatId: string;
  studioId?: string | null;
  model?: string | null;
}) {
  const model = params.model || DEFAULT_MODEL;

  try {
    await updateChatRunStatus(params.runId, "running", { liveAttachable: true });
    publishRunChunk(params.runId, params.streamKey, {
      type: "start",
      runId: params.runId,
      status: "running",
    });

    const previousMessages = await listMessagesForChat(params.chatId, 100);
    const modelMessages = buildModelMessages(previousMessages);

    const fakeEvent = {
      locals: params.locals,
      platform: params.platform,
    } as any;

    const tools = await createAgentTools(
      fakeEvent,
      params.userId,
      params.studioId ?? undefined,
      params.runId,
    );
    const runtimePolicy = await getRuntimePolicyForUser(params.userId);
    const openrouter = createOpenRouter({ apiKey: OPENROUTER_API_KEY });

    const result = streamText({
      model: openrouter(model),
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(runtimePolicy.maxToolSteps),
    });

    let fullText = "";
    let pendingText = "";
    const persistedParts: PersistedPart[] = [];
    let streamError: unknown = null;

    for await (const event of result.fullStream) {
      if (streamError) break;

      switch (event.type) {
        case "text-delta":
          fullText += (event as any).text;
          pendingText += (event as any).text;
          publishRunChunk(params.runId, params.streamKey, {
            type: "text",
            delta: (event as any).text,
          });
          break;

        case "tool-call":
          pendingText = flushTextPart(persistedParts, pendingText);
          persistedParts.push({
            type: "tool-call",
            toolCallId: String(event.toolCallId),
            toolName: String(event.toolName),
            input: (event as any).input,
          });
          publishRunChunk(params.runId, params.streamKey, {
            type: "tool",
            toolCallId: String(event.toolCallId),
            toolName: String(event.toolName),
            state: "input-available",
            input: (event as any).input,
          });
          break;

        case "tool-result":
          pendingText = flushTextPart(persistedParts, pendingText);
          persistedParts.push({
            type: "tool-result",
            toolCallId: String(event.toolCallId),
            toolName: String(event.toolName),
            output: (event as any).output,
          });
          publishRunChunk(params.runId, params.streamKey, {
            type: "tool-result",
            toolCallId: String(event.toolCallId),
            toolName: String(event.toolName),
            output: (event as any).output,
          });
          break;

        case "error":
          streamError = (event as any).error;
          break;

        case "abort":
          streamError = new Error(`Run aborted: ${(event as any).reason || "unknown reason"}`);
          break;
      }
    }

    if (streamError) {
      pendingText = flushTextPart(persistedParts, pendingText);
      const safePersistedParts = sanitizePersistedParts(persistedParts);
      const errMsg =
        streamError instanceof Error
          ? streamError.message
          : typeof streamError === "string"
            ? streamError
            : JSON.stringify(streamError);
      await saveMessage(
        params.chatId,
        params.userId,
        "assistant",
        fullText.trim() || errMsg,
        undefined,
        safePersistedParts.length > 0 ? safePersistedParts : null,
      );
      await updateChatRunStatus(params.runId, "failed", {
        liveAttachable: false,
        error: errMsg,
        endedAt: Date.now(),
      });
      failRunSession(params.runId, params.streamKey, errMsg);
      return;
    }

    pendingText = flushTextPart(persistedParts, pendingText);

    const assistantText = fullText.trim() || "Done.";
    await saveMessage(
      params.chatId,
      params.userId,
      "assistant",
      assistantText,
      undefined,
      persistedParts.length > 0 ? persistedParts : null,
    );

    await updateChatRunStatus(params.runId, "completed", {
      liveAttachable: false,
      endedAt: Date.now(),
    });
    publishRunChunk(params.runId, params.streamKey, {
      type: "done",
      runId: params.runId,
      status: "completed",
    });
    completeRunSession(params.runId, params.streamKey, "completed");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateChatRunStatus(params.runId, "failed", {
      liveAttachable: false,
      error: message,
      endedAt: Date.now(),
    });
    failRunSession(params.runId, params.streamKey, message);
  }
}
