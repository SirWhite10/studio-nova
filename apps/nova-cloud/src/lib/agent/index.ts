import { streamText, convertToModelMessages } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { tools } from "$lib/agent/tools";
import { getMemoryStore } from "$lib/memory";
import { getSkillManager } from "$lib/server/skill-manager";
import { OPENROUTER_API_KEY } from "$env/static/private";

function parseSkillCommands(message: string): string[] {
  const regex = /\/([a-zA-Z0-9][a-zA-Z0-9-]*)/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(message)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

export interface AgentConfig {
  model?: string;
  maxSteps?: number;
  enableMemory?: boolean;
  memorySearchLimit?: number;
}

const DEFAULT_MODEL = "stepfun/step-3.5-flash:free";
const DEFAULT_MAX_STEPS = 20;
const DEFAULT_ENABLE_MEMORY = true;
const DEFAULT_MEMORY_LIMIT = 10;

export class AgentOrchestrator {
  private config: AgentConfig;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = {
      model: config.model ?? DEFAULT_MODEL,
      maxSteps: config.maxSteps ?? DEFAULT_MAX_STEPS,
      enableMemory: config.enableMemory ?? DEFAULT_ENABLE_MEMORY,
      memorySearchLimit: config.memorySearchLimit ?? DEFAULT_MEMORY_LIMIT,
    };
  }

  private createLLM() {
    return createOpenRouter({
      apiKey: OPENROUTER_API_KEY,
    });
  }

  async processMessage(
    userMessage: string,
    chatId: string,
    existingMessages: any[] = [],
  ): Promise<Response> {
    const memory = getMemoryStore();
    await memory.initialize();

    // Build context from memory
    let memoryContext = "";
    if (this.config.enableMemory) {
      const memories = await memory.search(userMessage, this.config.memorySearchLimit, 0.4);
      if (memories.length > 0) {
        memoryContext =
          "\n\nRelevant past information:\n" +
          memories.map((m) => `- ${m.entry.content}`).join("\n");
      }
    }

    // Build skills context with explicit commands + semantic search
    let skillsContext = "";
    try {
      const skillManager = getSkillManager();
      await skillManager.initialize();

      // Parse explicit /skill commands from user message
      const skillCommands = parseSkillCommands(userMessage);
      const forcedSkills: any[] = [];

      if (skillCommands.length > 0) {
        for (const slug of skillCommands) {
          const skill = await skillManager.getBySlug(slug);
          if (skill && skill.enabled && !forcedSkills.find((s) => s.id === skill.id)) {
            forcedSkills.push(skill);
          }
        }
      }

      // Get semantic search results
      const semanticSkills = await skillManager.searchSkills(userMessage, 3);

      // Combine forced skills with semantic skills (deduplicated)
      const allSkills = [...forcedSkills];
      for (const skill of semanticSkills) {
        if (!allSkills.find((s) => s.id === skill.id)) {
          allSkills.push(skill);
        }
      }

      if (allSkills.length > 0) {
        skillsContext =
          "\n\nAvailable specialized skills:\n" +
          allSkills.map((s) => `--- Skill: ${s.name} ---\n${s.content}\n---`).join("\n\n");
      }
    } catch (error) {
      console.error("Failed to load skills:", error);
    }

    // Create system message with memory and skills context
    const systemMessage = {
      id: "system",
      role: "system" as const,
      content: `You are Nova, an intelligent AI assistant powered by multiple frontier models including xAI Grok, OpenAI GPT, and Google Gemini. You have full computer access: you can read files, write files, execute shell commands, and store/retrieve information from long-term memory. Different models may be used based on the task - you adapt to whatever model is currently active while maintaining consistent helpful behavior.${memoryContext}${skillsContext}`,
    };

    // Combine messages
    const allMessages = [
      systemMessage,
      ...existingMessages,
      {
        id: crypto.randomUUID(),
        role: "user" as const,
        content: userMessage,
      },
    ];

    // Store user message in memory
    if (this.config.enableMemory) {
      await memory.add(userMessage, {
        type: "conversation",
        chatId,
        sender: "user",
      });
    }

    // Stream response with tools (using any to bypass type checking)
    const result = (streamText as any)({
      model: this.createLLM()(this.config.model!),
      messages: convertToModelMessages(allMessages),
      tools,
      ...(this.config.maxSteps && {
        stopWhen: { type: "stepCount", value: this.config.maxSteps },
      }),
      onStepFinish: async (step: any) => {
        for (const toolCall of step.toolCalls || []) {
          console.log("Tool call:", toolCall.toolName, toolCall.args);
          if (this.config.enableMemory) {
            await memory.add(
              `Used tool ${toolCall.toolName} with args ${JSON.stringify(toolCall.args)}`,
              {
                type: "tool_use",
                chatId,
                tool: toolCall.toolName,
              },
            );
          }
        }
      },
      onFinish: async ({ response }: any) => {
        if (this.config.enableMemory && response.text) {
          await memory.add(response.text, {
            type: "conversation",
            chatId,
            sender: "assistant",
          });
        }
      },
    });

    return result.toUIMessageStreamResponse();
  }
}

let globalAgent: AgentOrchestrator | null = null;

export function getAgent(config?: Partial<AgentConfig>): AgentOrchestrator {
  if (!globalAgent) {
    globalAgent = new AgentOrchestrator(config);
  }
  return globalAgent;
}
