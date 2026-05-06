import type { RequestEvent } from "@sveltejs/kit";
import { SANDBOX_TOOLS_PROMPT } from "$lib/agent/sandbox-tools";
import { createAgentTools } from "$lib/agent/tools";
import { getRunSessionSnapshot } from "$lib/server/chat-run-registry";
import { getChat, listMessagesForChat } from "$lib/server/surreal-chats";
import { listRunsForChat } from "$lib/server/surreal-chat-runs";
import { searchMemoriesForUser } from "$lib/server/surreal-memory";
import { listSkillsByUser } from "$lib/server/surreal-skills";
import { requireUserId } from "$lib/server/surreal-query";

type AssembleChatContextParams = {
  chatId: string;
  userId: string;
  studioId?: string | null;
  model?: string | null;
  runId?: string;
};

export const DEFAULT_RUN_MAX_STEPS = 20;

function serializeStoredMessages(messages: any[]) {
  return messages.map((message: any) => ({
    id: message._id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    metadata: message.metadata ?? null,
    parts: Array.isArray(message.parts) ? message.parts : [],
  }));
}

function collectPersistedEvents(messages: any[]) {
  const events: Array<Record<string, unknown>> = [];

  for (const message of messages) {
    const parts = Array.isArray(message.parts) ? message.parts : [];
    for (const [index, part] of parts.entries()) {
      const partType = typeof part?.type === "string" ? part.type : "unknown";
      if (partType === "text") continue;

      events.push({
        messageId: message._id,
        messageRole: message.role,
        messageCreatedAt: message.createdAt,
        index,
        type: partType,
        payload: part,
      });
    }
  }

  return events;
}

export function buildNovaSystemPrompt(skillContext: string, memoryContext: string) {
  return `You are Nova, an extremely capable cloud agent with memory, skills, and on-demand Studio runtime access. You have full sandbox access when needed, including Bun, the filesystem, Git, dev servers, and related runtime tools.

You should be helpful, precise, proactive, and execution-oriented.

Rules you MUST follow every single turn:
- Think step by step.
- Use tools when needed to accomplish the user's goal.
- After using tools, ALWAYS provide a clear, concise explanation to the user.
- If the user asks to "explain", "why", "what are you doing", "summarize", or similar, respond directly and do not call tools unless they also ask you to take action.
- When you have completed the task or have a final response, start your message with the exact line: "FINAL ANSWER:" followed by your complete response to the user.
- Do not repeat the same tool call unnecessarily. If you've already done it, explain the result instead.
- Be helpful, precise, and proactive.

You have access to powerful sandbox and Studio tools. Use them wisely.

When a Studio has deployable workspaces, prefer the workspace tools first:
- \`workspace_list\` to inspect the current workspace set
- \`workspace_contract\` to fetch the runtime contract for a specific workspace
- \`workspace_create\` to create a new workspace record and runtime contract
- \`workspace_action\` to provision or preview a workspace

Use the workspace runtime contract as the source of truth for commands, storage paths, hostnames, and runtime metadata. Do not guess these values or hardcode them in responses.

${SANDBOX_TOOLS_PROMPT}
${skillContext ? `\n## Available Skills:\n${skillContext}\n` : ""}${memoryContext ? `## Relevant Memories:\n${memoryContext}\n` : ""}`;
}

export async function assembleChatContext(event: RequestEvent, params: AssembleChatContextParams) {
  const userId = requireUserId(event.locals);
  const messages = await listMessagesForChat(params.chatId, 50);
  const lastUserMessage = [...messages].reverse().find((message: any) => message.role === "user");
  const memories = await searchMemoriesForUser(userId, lastUserMessage?.content || "", 5).catch(
    () => [],
  );
  const skills = await listSkillsByUser(userId, true).catch(() => []);

  const memoryContext = Array.isArray(memories)
    ? memories
        .map((m: any) => m.entry?.content || m.content)
        .filter(Boolean)
        .join("\n---\n")
    : "";
  const skillContext = Array.isArray(skills)
    ? skills.map((skill: any) => `# ${skill.name}\n${skill.content}`).join("\n\n")
    : "";
  const systemPrompt = buildNovaSystemPrompt(skillContext, memoryContext);
  const allMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((message: any) => ({
      role: message.role === "tool" ? "assistant" : message.role,
      content: message.content,
    })),
  ];
  const tools = await createAgentTools(
    event,
    params.userId,
    params.studioId ?? undefined,
    params.runId,
  );
  const toolNames = Object.keys(tools).sort();

  return {
    model: params.model ?? "stepfun/step-3.5-flash",
    maxSteps: DEFAULT_RUN_MAX_STEPS,
    lastUserMessage: lastUserMessage?.content ?? "",
    messages,
    memories,
    skills,
    memoryContext,
    skillContext,
    systemPrompt,
    allMessages,
    tools,
    toolNames,
  };
}

export async function buildChatDebugPayload(event: RequestEvent, chatId: string) {
  const userId = requireUserId(event.locals);
  const [chat, runs] = await Promise.all([
    getChat(chatId),
    listRunsForChat(userId, chatId).catch(() => []),
  ]);

  if (!chat) {
    return null;
  }

  const latestRun = Array.isArray(runs) && runs.length > 0 ? runs[0] : null;
  const context = await assembleChatContext(event, {
    chatId,
    userId: latestRun?.userId ?? userId,
    studioId: latestRun?.studioId ?? (chat as any).studioId,
    model: latestRun?.model ?? "stepfun/step-3.5-flash",
    runId: latestRun?._id,
  });
  const { tools: _tools, ...serializableContext } = context;
  const serializedMessages = serializeStoredMessages(context.messages);
  const persistedEvents = collectPersistedEvents(context.messages);
  const runSessionSnapshot =
    latestRun && latestRun.streamKey
      ? getRunSessionSnapshot(latestRun._id, latestRun.streamKey)
      : null;

  return {
    chat: {
      id: (chat as any)._id,
      title: (chat as any).title,
      studioId: (chat as any).studioId,
      createdAt: (chat as any).createdAt,
      updatedAt: (chat as any).updatedAt,
    },
    run: latestRun
      ? {
          id: (latestRun as any)._id,
          status: (latestRun as any).status,
          model: (latestRun as any).model,
          attempt: (latestRun as any).attempt,
          streamKey: (latestRun as any).streamKey,
          liveAttachable: (latestRun as any).liveAttachable,
          startedAt: (latestRun as any).startedAt,
          endedAt: (latestRun as any).endedAt ?? null,
          createdAt: (latestRun as any).createdAt,
          updatedAt: (latestRun as any).updatedAt,
          completedAt: (latestRun as any).completedAt ?? null,
          error: (latestRun as any).error ?? null,
          runtimeEngaged: (latestRun as any).runtimeEngaged,
          runtimeToolName: (latestRun as any).runtimeToolName ?? null,
          previewUrl: (latestRun as any).previewUrl ?? null,
        }
      : null,
    runs: Array.isArray(runs)
      ? runs.map((run: any) => ({
          id: run._id,
          status: run.status,
          model: run.model ?? null,
          streamKey: run.streamKey,
          liveAttachable: run.liveAttachable,
          error: run.error ?? null,
          startedAt: run.startedAt,
          endedAt: run.endedAt ?? null,
          createdAt: run.createdAt,
          updatedAt: run.updatedAt,
          runtimeEngaged: run.runtimeEngaged ?? null,
          runtimeToolName: run.runtimeToolName ?? null,
          previewUrl: run.previewUrl ?? null,
        }))
      : [],
    liveSession: runSessionSnapshot,
    persistedEvents,
    context: serializableContext,
    storedMessages: serializedMessages,
  };
}
