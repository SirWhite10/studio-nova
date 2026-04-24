import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { RequestEvent } from "@sveltejs/kit";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { OPENROUTER_API_KEY } from "$env/static/private";
import { createTools } from "$lib/agent/tools";
import { addMemoryForUser, searchMemoriesForUser } from "$lib/server/surreal-memory";
import { getUserIdFromLocals } from "$lib/server/surreal-query";
import { createChat, saveMessage, updateChat } from "$lib/server/surreal-chats";

const defaultModel = "stepfun/step-3.5-flash";

export const POST = async (event: RequestEvent) => {
  try {
    const body = await event.request.json();
    const {
      messages,
      apiKey,
      chatId,
      userId,
    }: { messages: any[]; apiKey?: string; chatId?: string; userId?: string } = body;

    const effectiveUserId =
      userId || getUserIdFromLocals(event.locals as App.Locals) || "anonymous";

    // Ensure chat exists (Surreal primary)
    let currentChatId = chatId;
    if (!currentChatId && effectiveUserId !== "anonymous") {
      const newChat = await createChat(effectiveUserId);
      currentChatId = newChat.id as string;
    }

    // Create tools with user context for sandbox
    const tools = await createTools(event, effectiveUserId);

    // Memory operations using SurrealDB (auth scoped by userId)
    let memoryContext = "";
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();
    if (lastUserMessage && effectiveUserId !== "anonymous" && currentChatId) {
      const userText =
        (lastUserMessage.parts || []).find((p: any) => p.type === "text")?.text || "";
      if (userText) {
        try {
          const memories = await searchMemoriesForUser(effectiveUserId, userText, 5);
          if (memories.length > 0) {
            memoryContext =
              "\n\nRelevant past information:\n" +
              memories.map((m: any) => `- ${m.entry.content}`).join("\n");
          }
        } catch (e) {
          console.error("[ERROR] Memory search failed:", e);
        }

        // Store user message + persist to Surreal chat
        try {
          await Promise.all([
            addMemoryForUser(effectiveUserId, userText, {
              type: "conversation",
              chatId: currentChatId,
            }),
            saveMessage(currentChatId, effectiveUserId, "user", userText),
          ]);
        } catch (e) {
          console.error("[ERROR] Memory/message save failed:", e);
        }

        // Update chat title on first message if default
        if (!chatId) {
          await updateChat(currentChatId, { title: userText.slice(0, 60) || "New chat" });
        }
      }
    }

    // Create system message with memory context
    const systemMessage = {
      id: "system-" + crypto.randomUUID(),
      role: "system",
      parts: [
        {
          type: "text",
          text: `You are Nova, an intelligent AI assistant powered by multiple frontier models including xAI Grok, OpenAI GPT, and Google Gemini. You have full computer access: you can read files, write files, execute shell commands, and store/retrieve information from long-term memory. Different models may be used based on the task - you adapt to whatever model is currently active while maintaining consistent helpful behavior.${memoryContext}`,
        },
      ],
    };

    const allMessages = [systemMessage, ...messages];

    let openrouter = createOpenRouter({ apiKey: OPENROUTER_API_KEY });
    if (apiKey) {
      openrouter = createOpenRouter({ apiKey });
    }

    const result = streamText({
      model: openrouter(defaultModel),
      messages: await convertToModelMessages(allMessages),
      tools,
      stopWhen: stepCountIs(5),
    });

    const uiResponse = result.toUIMessageStreamResponse({
      originalMessages: allMessages,
    });
    if (!uiResponse.body) return new Response("No stream body", { status: 500 });

    // Return chatId in headers for client to track new chats
    const response = uiResponse;
    if (currentChatId && !chatId) {
      response.headers.set("x-chat-id", currentChatId);
    }
    return response;
  } catch (error) {
    console.error("[ERROR] Chat API error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
    });
  }
};
