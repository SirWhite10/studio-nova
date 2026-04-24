# AI Agent with Long-Term Memory: Implementation Plan

## Project Overview

Build an AI agent with computer access capabilities and sophisticated memory system integrated into existing SvelteKit application.

**Stack:**

- **Frontend**: SvelteKit (Bun runtime) with existing UI components
- **Memory**: agenticmemory (Rust core, Node bindings) + Transformers.js (local embeddings)
- **LLM**: OpenRouter cloud API (multiple model support)
- **Tools**: Bun native APIs (filesystem, shell execution)
- **Database**: None - agenticmemory handles persistence

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SvelteKit on Bun                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌───────────────┐   ┌───────────────┐   ┌──────────────┐ │
│   │ agenticmemory │   │ Transformers  │   │ LLM Cloud    │ │
│   │ (Rust+Node)   │   │ .js (Local)   │   │ API          │ │
│   │ ~200µs query  │   │ 22MB model    │   │ OpenAI/etc   │ │
│   └───────────────┘   └───────────────┘   └──────────────┘ │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐ │
│   │              Bun Native APIs                          │ │
│   │  • Bun.fetch() → LLM APIs                            │ │
│   │  • Bun.file() → Filesystem operations               │ │
│   │  • Bun.spawn() → Shell commands                      │ │
│   └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
nova-sveltekit/
├── src/
│   ├── lib/
│   │   ├── memory/
│   │   │   ├── index.ts              # MemoryManager facade
│   │   │   ├── embeddings.ts         # Transformers.js wrapper
│   │   │   └── types.ts              # Shared interfaces
│   │   │
│   │   ├── agent/
│   │   │   ├── index.ts              # Agent orchestrator
│   │   │   ├── llm.ts                # Cloud LLM client
│   │   │   ├── tools/
│   │   │   │   ├── index.ts          # Tool registry
│   │   │   │   ├── filesystem.ts     # Bun.file tools
│   │   │   │   ├── shell.ts          # Bun.spawn tools
│   │   │   │   └── memory.ts         # Memory access tools
│   │   │   └── prompts/
│   │   │       └── system.ts         # System prompt
│   │   │
│   │   └── components/
│   │       ├── sidebar/
│   │       │   ├── chat-sidebar.svelte       # Main sidebar
│   │       │   ├── chat-history-list.svelte  # Recent 5 chats
│   │       │   └── sidebar-nav.svelte        # Navigation items
│   │       │
│   │       ├── chat/
│   │       │   ├── chat-view.svelte          # FullChatApp wrapper
│   │       │   ├── model-selector.svelte     # Model dropdown
│   │       │   └── chat-empty-state.svelte   # New chat placeholder
│   │       │
│   │       └── dashboard/
│   │           ├── dashboard.svelte          # Home page content
│   │           ├── recent-chats.svelte       # Recent chats grid
│   │           └── quick-actions.svelte      # Quick action buttons
│   │
│   ├── routes/
│   │   ├── +layout.svelte                    # MODIFY: Add sidebar wrapper
│   │   ├── +page.svelte                      # MODIFY: Dashboard view
│   │   │
│   │   ├── chat/
│   │   │   ├── +page.svelte                  # NEW: Redirect to new chat
│   │   │   └── [id]/
│   │   │       └── +page.svelte              # NEW: Chat session view
│   │   │
│   │   ├── history/
│   │   │   └── +page.svelte                  # NEW: Full history page
│   │   │
│   │   ├── settings/
│   │   │   └── +page.svelte                  # NEW: Settings page
│   │   │
│   │   └── about/
│   │       └── +page.svelte                  # NEW: About page
│   │
│   └── app.html
│
├── data/
│   └── memory.bin                    # agenticmemory persistence file
│
├── embeddings/
│   ├── server.py                     # (Optional - if not using Transformers.js)
│   └── requirements.txt
│
├── package.json
├── tsconfig.json
└── bunfig.toml
```

---

## Core Components

### 1. Memory System (`src/lib/memory/`)

**types.ts**

```typescript
export interface MemoryEpisode {
  id: string;
  chatId: string;
  content: string;
  embedding: number[]; // 384 dimensions
  role: "user" | "assistant";
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  lastMessageAt: number;
  messageCount: number;
}

export interface MemoryQuery {
  query: string;
  chatId?: string;
  limit?: number;
  threshold?: number;
}
```

**embeddings.ts**

```typescript
import { pipeline } from "@xenova/transformers";

let embedder: any = null;

export async function initEmbeddings(): Promise<void> {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { quantized: true });
  }
}

export async function embed(text: string): Promise<number[]> {
  if (!embedder) await initEmbeddings();
  const output = await embedder(text, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!embedder) await initEmbeddings();
  const outputs = await embedder(texts, {
    pooling: "mean",
    normalize: true,
  });
  return outputs.map((o) => Array.from(o.data));
}
```

**index.ts** (MemoryManager)

```typescript
import { AgentMemDB, Episode } from "agenticmemory";
import { embed, embedBatch } from "./embeddings";
import type { MemoryEpisode, ChatSession } from "./types";

export class MemoryManager {
  private db: AgentMemDB;
  private cache: Map<string, ChatSession[]> = new Map();

  constructor() {
    this.db = new AgentMemDB(384);
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      this.db.load_from_disk("data/memory.bin");
    } catch (e) {
      console.log("No existing memory file, starting fresh");
    }
  }

  private saveToDisk(): void {
    this.db.save_to_disk("data/memory.bin");
  }

  async storeMessage(
    chatId: string,
    content: string,
    role: "user" | "assistant",
    metadata?: Record<string, any>,
  ): Promise<void> {
    const embedding = await embed(content);

    const episode = new Episode({
      task_id: crypto.randomUUID(),
      state_embedding: embedding,
      reward: 1.0,
      tags: [chatId, role, ...(metadata?.tags || [])],
      data: JSON.stringify({
        chatId,
        content,
        role,
        timestamp: Date.now(),
        metadata,
      }),
    });

    this.db.store_episode(episode);
    this.updateChatSession(chatId, content, role);
    this.saveToDisk();
  }

  async recall(query: string, chatId?: string, limit: number = 5): Promise<MemoryEpisode[]> {
    const embedding = await embed(query);

    const results = this.db.query_similar(embedding, 0.0, limit * 2);

    let filtered = results;
    if (chatId) {
      filtered = results.filter((ep) => {
        try {
          const data = JSON.parse(ep.data);
          return data.chatId === chatId;
        } catch {
          return false;
        }
      });
    }

    return filtered.slice(0, limit);
  }

  async getChatSessions(): Promise<ChatSession[]> {
    if (this.cache.has("sessions")) {
      return this.cache.get("sessions")!;
    }

    const episodes = this.db.get_all_episodes();
    const sessionMap = new Map<string, any>();

    for (const ep of episodes) {
      try {
        const data = JSON.parse(ep.data);
        const chatId = data.chatId;
        if (!chatId) continue;

        if (!sessionMap.has(chatId)) {
          sessionMap.set(chatId, {
            id: chatId,
            title: data.content.length > 50 ? data.content.substring(0, 50) + "..." : data.content,
            createdAt: ep.creation_timestamp,
            lastMessageAt: ep.creation_timestamp,
            messageCount: 0,
          });
        }

        const session = sessionMap.get(chatId)!;
        session.lastMessageAt = Math.max(session.lastMessageAt, ep.creation_timestamp);
        session.messageCount++;
      } catch {
        continue;
      }
    }

    const sessions = Array.from(sessionMap.values()).sort(
      (a, b) => b.lastMessageAt - a.lastMessageAt,
    );

    this.cache.set("sessions", sessions);
    return sessions;
  }

  async getChatMessages(chatId: string): Promise<MemoryEpisode[]> {
    const all = this.db.get_all_episodes();
    return all
      .filter((ep) => {
        try {
          const data = JSON.parse(ep.data);
          return data.chatId === chatId;
        } catch {
          return false;
        }
      })
      .sort((a, b) => a.creation_timestamp - b.creation_timestamp);
  }

  async deleteChat(chatId: string): Promise<void> {
    const all = this.db.get_all_episodes();
    const toRemove: number[] = [];

    all.forEach((ep, idx) => {
      try {
        const data = JSON.parse(ep.data);
        if (data.chatId === chatId) {
          toRemove.push(idx);
        }
      } catch {
        // ignore malformed entries
      }
    });

    toRemove.reverse().forEach((idx) => {
      this.db.delete_episode_at(idx);
    });

    this.cache.delete("sessions");
    this.saveToDisk();
  }

  private updateChatSession(chatId: string, content: string, role: string): void {
    this.cache.delete("sessions");
  }

  clearAll(): void {
    this.db = new AgentMemDB(384);
    this.cache.clear();
    this.saveToDisk();
  }
}
```

---

### 2. Agent Tools (`src/lib/agent/tools/`)

**index.ts**

```typescript
import { filesystemTools } from "./filesystem";
import { shellTools } from "./shell";
import { memoryTools } from "./memory";

export const allTools = [...filesystemTools, ...shellTools, ...memoryTools];

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export async function executeToolCall(name: string, args: Record<string, any>): Promise<any> {
  const tool = allTools.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return await tool.execute(args);
}

export function getToolDefinitions(): any[] {
  return allTools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: tool.parameters,
        required: Object.keys(tool.parameters),
      },
    },
  }));
}
```

**filesystem.ts**

```typescript
import { rm, readFile, writeFile, mkdir, readdir } from "bun";

export const filesystemTools = {
  read_file: {
    name: "read_file",
    description: "Read contents of a file from the filesystem",
    parameters: {
      path: { type: "string", description: "Absolute or relative path to the file" },
    },
    execute: async (args: { path: string }): Promise<string> => {
      try {
        return await readFile(args.path, "utf-8");
      } catch (e: any) {
        throw new Error(`Failed to read file: ${e.message}`);
      }
    },
  },

  write_file: {
    name: "write_file",
    description: "Write content to a file, creating it if it does not exist",
    parameters: {
      path: { type: "string", description: "Path where the file should be written" },
      content: { type: "string", description: "Content to write to the file" },
    },
    execute: async (args: { path: string; content: string }): Promise<string> => {
      try {
        await writeFile(args.path, args.content);
        return `Successfully wrote ${args.content.length} bytes to ${args.path}`;
      } catch (e: any) {
        throw new Error(`Failed to write file: ${e.message}`);
      }
    },
  },

  list_dir: {
    name: "list_dir",
    description: "List files and directories in a specified path",
    parameters: {
      path: { type: "string", description: "Directory path to list" },
    },
    execute: async (args: { path: string }): Promise<string[]> => {
      try {
        const entries = await readdir(args.path, { withFileTypes: true });
        return entries.map((entry) => ({
          name: entry.name,
          type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other",
        }));
      } catch (e: any) {
        throw new Error(`Failed to list directory: ${e.message}`);
      }
    },
  },

  glob_search: {
    name: "glob_search",
    description: "Find files matching a glob pattern",
    parameters: {
      pattern: { type: "string", description: 'Glob pattern (e.g., "**/*.ts")' },
      cwd: { type: "string", description: "Working directory (optional)", optional: true },
    },
    execute: async (args: { pattern: string; cwd?: string }): Promise<string[]> => {
      try {
        const files: string[] = [];
        const { glob } = require("bun");
        for await (const file of glob(args.pattern, { cwd: args.cwd || process.cwd() })) {
          files.push(file);
        }
        return files;
      } catch (e: any) {
        throw new Error(`Glob search failed: ${e.message}`);
      }
    },
  },

  delete_file: {
    name: "delete_file",
    description: "Delete a file from the filesystem",
    parameters: {
      path: { type: "string", description: "Path to the file to delete" },
    },
    execute: async (args: { path: string }): Promise<string> => {
      try {
        await rm(args.path, { force: true, recursive: false });
        return `Deleted file: ${args.path}`;
      } catch (e: any) {
        throw new Error(`Failed to delete file: ${e.message}`);
      }
    },
  },

  create_dir: {
    name: "create_dir",
    description: "Create a directory and parent directories if needed",
    parameters: {
      path: { type: "string", description: "Directory path to create" },
    },
    execute: async (args: { path: string }): Promise<string> => {
      try {
        await mkdir(args.path, { recursive: true });
        return `Created directory: ${args.path}`;
      } catch (e: any) {
        throw new Error(`Failed to create directory: ${e.message}`);
      }
    },
  },

  file_exists: {
    name: "file_exists",
    description: "Check if a file or directory exists",
    parameters: {
      path: { type: "string", description: "Path to check" },
    },
    execute: async (args: { path: string }): Promise<{ exists: boolean; type: string | null }> => {
      try {
        const stats = Bun.file(args.path).stat();
        let type = null;
        if (stats.isFile()) type = "file";
        else if (stats.isDirectory()) type = "directory";
        return { exists: true, type };
      } catch {
        return { exists: false, type: null };
      }
    },
  },
};
```

**shell.ts**

```typescript
import { $ } from "bun";

export const shellTools = {
  execute_command: {
    name: "execute_command",
    description: "Execute a shell command. Use with caution - this can modify the system",
    parameters: {
      command: { type: "string", description: "Shell command to execute" },
      cwd: { type: "string", description: "Working directory for the command", optional: true },
      timeout: {
        type: "number",
        description: "Timeout in milliseconds (optional)",
        optional: true,
      },
    },
    execute: async (args: {
      command: string;
      cwd?: string;
      timeout?: number;
    }): Promise<{
      stdout: string;
      stderr: string;
      exitCode: number;
    }> => {
      try {
        // Security: warn about dangerous commands
        const dangerousPatterns = [
          /rm\s+-rf/,
          /dd\s+/,
          /mv\s+\/\s+/,
          /:\(\)\{:/,
          />\s*\/dev\/sda/,
          /mkfs/,
          /fdisk/,
          /format/,
        ];

        if (dangerousPatterns.some((pattern) => pattern.test(args.command))) {
          throw new Error("Potentially dangerous command blocked for safety");
        }

        const result = await $`${args.command}`.cwd(args.cwd || process.cwd());

        return {
          stdout: result.stdout.toString(),
          stderr: result.stderr.toString(),
          exitCode: result.exitCode,
        };
      } catch (e: any) {
        return {
          stdout: "",
          stderr: e.message,
          exitCode: 1,
        };
      }
    },
  },

  execute_interactive: {
    name: "execute_interactive",
    description: "Execute a command and get real-time output (for long-running processes)",
    parameters: {
      command: { type: "string", description: "Command to execute" },
      cwd: { type: "string", description: "Working directory", optional: true },
    },
    execute: async (args: { command: string; cwd?: string }): Promise<any> => {
      throw new Error("Interactive execution not yet implemented");
    },
  },
};
```

**memory.ts**

```typescript
import { getMemoryManager } from "$lib/memory";

export const memoryTools = {
  recall_memory: {
    name: "recall_memory",
    description: "Search past conversations and experiences using semantic similarity",
    parameters: {
      query: { type: "string", description: "Search query describing what you're looking for" },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 5)",
        optional: true,
      },
    },
    execute: async (args: { query: string; limit?: number }): Promise<any[]> => {
      const memory = getMemoryManager();
      const episodes = await memory.recall(args.query, undefined, args.limit || 5);

      return episodes
        .map((ep) => {
          try {
            const data = JSON.parse(ep.data);
            return {
              role: data.role,
              content: data.content,
              timestamp: ep.creation_timestamp,
              relevance_score: (ep as any).score || 0.95,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    },
  },

  store_memory: {
    name: "store_memory",
    description: "Store an important fact or experience for future recall",
    parameters: {
      content: { type: "string", description: "Content to store in memory" },
      type: {
        type: "string",
        description: "Type: conversation, fact, preference, pattern",
        optional: true,
      },
    },
    execute: async (args: { content: string; type?: string }): Promise<string> => {
      const memory = getMemoryManager();
      await memory.storeMessage("global", args.content, "assistant", { type: args.type || "fact" });
      return `Stored in memory: ${args.content.substring(0, 50)}...`;
    },
  },

  get_chat_sessions: {
    name: "get_chat_sessions",
    description: "Get list of all chat sessions",
    parameters: {},
    execute: async (): Promise<any[]> => {
      const memory = getMemoryManager();
      return await memory.getChatSessions();
    },
  },

  get_chat_history: {
    name: "get_chat_history",
    description: "Get full message history for a specific chat",
    parameters: {
      chatId: { type: "string", description: "Chat session ID" },
    },
    execute: async (args: { chatId: string }): Promise<any[]> => {
      const memory = getMemoryManager();
      const episodes = await memory.getChatMessages(args.chatId);
      return episodes
        .map((ep) => {
          try {
            const data = JSON.parse(ep.data);
            return {
              role: data.role,
              content: data.content,
              timestamp: data.timestamp,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    },
  },

  delete_chat: {
    name: "delete_chat",
    description: "Delete an entire chat session",
    parameters: {
      chatId: { type: "string", description: "Chat session ID to delete" },
    },
    execute: async (args: { chatId: string }): Promise<string> => {
      const memory = getMemoryManager();
      await memory.deleteChat(args.chatId);
      return `Deleted chat session: ${args.chatId}`;
    },
  },
};
```

---

### 3. Agent Orchestrator (`src/lib/agent/index.ts`)

```typescript
import { getMemoryManager, type MemoryManager } from "$lib/memory";
import { executeToolCall, getToolDefinitions } from "./tools";
import { systemPrompt } from "./prompts/system";
import { OPENROUTER_API_KEY } from "$env/static/private";

export interface AgentMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AgentOptions {
  chatId: string;
  model?: string;
}

export class Agent {
  private memory: MemoryManager;
  private chatId: string;
  private model: string;

  constructor(chatId: string, model?: string) {
    this.memory = getMemoryManager();
    this.chatId = chatId;
    this.model = model || "stepfun/step-3.5-flash:free";
  }

  async processMessage(userMessage: string): Promise<AsyncIterable<string>> {
    // 1. Store user message to memory immediately
    await this.memory.storeMessage(this.chatId, userMessage, "user");

    // 2. Recall relevant past context
    const relevantMemory = await this.memory.recall(userMessage, this.chatId, 5);

    // Build context from memory
    const memoryContext = relevantMemory
      .map((ep) => {
        try {
          const data = JSON.parse(ep.data);
          return `${data.role === "user" ? "User" : "Assistant"}: ${data.content}`;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .join("\n\n");

    // 3. Build messages array
    const messages: AgentMessage[] = [
      {
        role: "system",
        content: systemPrompt.replace(
          "{memory_context}",
          memoryContext || "No relevant past context.",
        ),
      },
      {
        role: "user",
        content: userMessage,
      },
    ];

    // 4. Get chat history for this session
    const chatHistory = await this.memory.getChatMessages(this.chatId);
    for (const ep of chatHistory) {
      try {
        const data = JSON.parse(ep.data);
        if (data.role !== "system") {
          messages.push({
            role: data.role === "user" ? "user" : "assistant",
            content: data.content,
          });
        }
      } catch {
        continue;
      }
    }

    // 5. Stream response with tool calls
    return this.streamWithTools(messages);
  }

  private async *streamWithTools(messages: AgentMessage[]): AsyncIterable<string> {
    const toolDefs = getToolDefinitions();

    // Initial LLM call
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        tools: toolDefs,
        stream: true,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    let fullResponse = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += new TextDecoder().decode(value);
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              yield content;
            }

            // Check for tool calls
            const toolCalls = parsed.choices?.[0]?.delta?.tool_calls;
            if (toolCalls) {
              for (const toolCall of toolCalls) {
                if (toolCall.function?.name && toolCall.function?.arguments) {
                  const result = await this.executeTool(
                    toolCall.function.name,
                    JSON.parse(toolCall.function.arguments),
                  );
                  yield `\n\n[Tool Result: ${toolCall.function.name}]\n${result}\n\n`;

                  // Recursive call to continue
                  messages.push({
                    role: "assistant",
                    content: fullResponse,
                  });
                  messages.push({
                    role: "tool",
                    content: result,
                  });

                  yield* this.streamWithTools(messages);
                  return;
                }
              }
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }

    // Store assistant response to memory
    await this.memory.storeMessage(this.chatId, fullResponse, "assistant");
  }

  private async executeTool(name: string, args: Record<string, any>): Promise<string> {
    try {
      const result = await executeToolCall(name, args);
      return JSON.stringify(result, null, 2);
    } catch (e: any) {
      return `Error: ${e.message}`;
    }
  }
}
```

---

### 4. System Prompt (`src/lib/agent/prompts/system.ts`)

```typescript
export const systemPrompt = `
You are an AI assistant with full computer access and access to past conversations.

## Memory Context
Here is relevant context from past conversations:
{memory_context}

## Available Tools

You have access to the following tools to help the user:

1. read_file(path): Read any file on the system
2. write_file(path, content): Write content to a file
3. list_dir(path): List directory contents
4. glob_search(pattern, cwd?): Find files matching a pattern
5. delete_file(path): Delete a file
6. create_dir(path): Create a directory
7. file_exists(path): Check if a file/directory exists
8. execute_command(command, cwd?, timeout?): Run a shell command
9. recall_memory(query, limit?): Search past conversations
10. store_memory(content, type?): Store important information
11. get_chat_sessions(): List all chat sessions
12. get_chat_history(chatId): Get full history of a chat
13. delete_chat(chatId): Delete a chat session

## Instructions

- Use tools when necessary to accomplish tasks
- Be helpful, accurate, and efficient
- Explain what you're doing when running commands
- Use recall_memory to find relevant past information
- Store important facts or user preferences with store_memory
- Always confirm destructive operations (file deletion, large-scale changes)
- Respect the user's workspace and privacy

## Safety

- Never run commands that could harm the system (rm -rf /, format, dd, etc.)
- Be cautious with file modifications
- Ask for clarification if instructions are unclear

You are conversing with a user through a chat interface. Be conversational and helpful.
`;
```

---

### 5. Chat API (`src/routes/api/chat/+server.ts`)

```typescript
import { json } from "@sveltejs/kit";
import { Agent } from "$lib/agent";
import { getMemoryManager } from "$lib/memory";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { messages, apiKey, model, chatId } = await request.json();

    // Ensure we have a chatId
    const sessionChatId = chatId || crypto.randomUUID();

    // Get the latest user message
    const userMessage = messages[messages.length - 1];
    if (userMessage.role !== "user") {
      throw new Error("Expected user message");
    }

    // Extract text from message parts
    const text = userMessage.parts
      ? userMessage.parts.map((p) => (p.type === "text" ? p.text : "")).join("")
      : userMessage.content;

    // Create agent and process
    const agent = new Agent(sessionChatId, model);
    const stream = await agent.processMessage(text);

    // Return streaming response
    const encoder = new TextEncoder();

    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              controller.enqueue(encoder.encode(chunk));
            }
            controller.enqueue(encoder.encode("[DONE]"));
            controller.close();
          } catch (e) {
            controller.error(e);
          }
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      },
    );
  } catch (e: any) {
    return json({ error: e.message }, { status: 500 });
  }
};
```

---

### 6. Chat History API (`src/routes/api/history/+server.ts`)

```typescript
import { json } from "@sveltejs/kit";
import { getMemoryManager } from "$lib/memory";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  try {
    const memory = getMemoryManager();
    const sessions = await memory.getChatSessions();
    return json(sessions);
  } catch (e: any) {
    return json({ error: e.message }, { status: 500 });
  }
};
```

---

### 7. Chat Session API (`src/routes/api/chat/[id]/+server.ts`)

```typescript
import { json } from "@sveltejs/kit";
import { getMemoryManager } from "$lib/memory";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
  try {
    const memory = getMemoryManager();
    const messages = await memory.getChatMessages(params.id);
    return json({ id: params.id, messages });
  } catch (e: any) {
    return json({ error: e.message }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const memory = getMemoryManager();
    await memory.deleteChat(params.id);
    return json({ success: true });
  } catch (e: any) {
    return json({ error: e.message }, { status: 500 });
  }
};
```

---

### 8. Chat UI Components

**chats-sidebar.svelte**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { Plus, History } from '@lucide/svelte';
  import { MemoryManager } from '$lib/memory';

  let memory = new MemoryManager();
  let chatSessions = $state<any[]>([]);
  let isLoading = $state(true);

  onMount(async () => {
    await refreshChats();
  });

  async function refreshChats() {
    isLoading = true;
    chatSessions = await memory.getChatSessions();
    isLoading = false;
  }

  async function createNewChat() {
    const id = crypto.randomUUID();
    // Create empty session in memory
    await memory.storeMessage(id, '', 'user');
    navigate(`/chat/${id}`);
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }
</script>

<div class="flex h-full flex-col">
  <div class="p-2">
    <Button onclick={createNewChat} class="w-full justify-start gap-2">
      <Plus size={16} />
      New Chat
    </Button>
  </div>

  <div class="flex-1 overflow-y-auto px-2">
    <div class="space-y-1">
      {#each chatSessions.slice(0, 5) as chat (chat.id)}
        <a
          href="/chat/{chat.id}"
          class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent group"
        >
          <span class="flex-1 truncate">{chat.title}</span>
          <span class="text-xs text-muted-foreground">{formatDate(chat.lastMessageAt)}</span>
        </a>
      {/each}
    </div>

    {#if chatSessions.length > 5}
      <a
        href="/history"
        class="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
      >
        <History size={16} />
        View all
      </a>
    {/if}
  </div>
</div>
```

**chat-view.svelte** (replaces FullChatApp usage)

```svelte
<script lang="ts">
  import { FullChatApp } from '$lib/components/prompt-kit-primitives/full-chat-app';
  import ModelSelector from './model-selector.svelte';
  import { page } from '$app/stores';

  let chatId = $derived($page.params.id);
  let selectedModel = $state(localStorage.getItem('selectedModel') || 'stepfun/step-3.5-flash:free');

  function onModelChange(model: string) {
    selectedModel = model;
    localStorage.setItem('selectedModel', model);
  }
</script>

<div class="flex h-full flex-col">
  <div class="border-b p-2">
    <ModelSelector {selectedModel} {onModelChange} />
  </div>

  <div class="flex-1 overflow-hidden">
    <FullChatApp chatId={chatId} />
  </div>
</div>
```

**dashboard.svelte** (home page)

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import RecentChats from './recent-chats.svelte';
  import QuickActions from './quick-actions.svelte';
  import { MessageSquare, Bot, FileText, Settings } from '@lucide/svelte';

  let recentSessions = $state<any[]>([]);

  onMount(async () => {
    const memory = new (await import('$lib/memory')).MemoryManager();
    recentSessions = await memory.getChatSessions();
  });
</script>

<div class="container mx-auto p-6">
  <div class="mb-8">
    <h1 class="text-3xl font-bold">Welcome to Nova</h1>
    <p class="text-muted-foreground mt-2">
      Your AI assistant with memory and computer access capabilities
    </p>
  </div>

  <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    <div class="rounded-lg border p-6">
      <Bot size={32} class="mb-4 text-primary" />
      <h2 class="font-semibold">Start a Chat</h2>
      <p class="text-sm text-muted-foreground mt-2">
        Begin a new conversation with the AI agent
      </p>
      <Button href="/chat/new" class="mt-4">New Chat</Button>
    </div>

    <div class="rounded-lg border p-6">
      <MessageSquare size={32} class="mb-4 text-primary" />
      <h2 class="font-semibold">Recent Chats</h2>
      <p class="text-sm text-muted-foreground mt-2">
        Continue your previous conversations
      </p>
      <div class="mt-4 space-y-2">
        {#each recentSessions.slice(0, 3) as chat}
          <a href="/chat/{chat.id}" class="block text-sm hover:underline">
            {chat.title}
          </a>
        {/each}
      </div>
    </div>

    <div class="rounded-lg border p-6">
      <Settings size={32} class="mb-4 text-primary" />
      <h2 class="font-semibold">Settings</h2>
      <p class="text-sm text-muted-foreground mt-2">
        Configure models, tools, and preferences
      </p>
      <Button href="/settings" variant="outline" class="mt-4">Open Settings</Button>
    </div>
  </div>

  <div class="mt-8">
    <h2 class="mb-4 text-xl font-semibold">Quick Actions</h2>
    <QuickActions />
  </div>
</div>
```

---

### 9. Root Layout (`src/routes/+layout.svelte`) - MODIFY

```svelte
<script lang="ts">
  import { setContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import AppSidebar from '$lib/components/sidebar/chat-sidebar.svelte';

  // Get current route to highlight sidebar items
  $: currentPath = $page.url.pathname;
</script>

<Sidebar.Provider>
  <AppSidebar />
  <Sidebar.Inset>
    <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <Sidebar.Trigger class="-ms-1" />
      <Separator orientation="vertical" class="me-2 h-4" />
      <nav class="flex items-center space-x-1 text-sm">
        <a href="/" class="hover:text-foreground/80">Home</a>
        {#if currentPath.startsWith('/chat')}
          <span class="text-muted-foreground">/</span>
          <span class="font-medium">Chat</span>
        {/if}
      </nav>
    </header>

    <main class="flex-1 overflow-y-auto">
      <slot />
    </main>
  </Sidebar.Inset>
</Sidebar.Provider>
```

---

### 10. Chat Routes

**src/routes/chat/+page.svelte**

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';

  onMount(() => {
    const id = crypto.randomUUID();
    goto(`/chat/${id}`);
  });
</script>

<div class="flex h-full items-center justify-center">
  <div class="text-center">
    <div class="mb-4 text-6xl">⚡</div>
    <p>Creating new chat...</p>
  </div>
</div>
```

**src/routes/chat/[id]/+page.svelte**

```svelte
<script lang="ts">
  import ChatView from '$lib/components/chat/chat-view.svelte';
  import { page } from '$app/stores';
</script>

<ChatView />
```

---

## Dependencies

### Runtime Dependencies

```bash
bun add @xenova/transformers
```

### devDependencies (already in package.json)

- @sveltejs/kit
- @sveltejs/adapter-bun
- svelte

### agenticmemory Node Bindings

Build from source:

```bash
# Clone repository
git clone https://github.com/sathvikkurap/agenticmemory /tmp/agenticmemory

# Build Node bindings
cd /tmp/agenticmemory/node
bun install
bun run build

# The build output will be in:
# /tmp/agenticmemory/node/dist/

# Copy to your project:
cp -r /tmp/agenticmemory/node/dist ./node_modules/agenticmemory/
# OR create a symlink:
ln -s /tmp/agenticmemory/node ./node_modules/agenticmemory
```

**Alternative:** Publish the package and `bun add agenticmemory`

---

## Environment Variables

`.env`

```env
OPENROUTER_API_KEY=your_key_here
```

---

## Data Directory

```bash
mkdir -p data
touch data/memory.bin
```

---

## Implementation Phases

### Phase 1: Infrastructure (Day 1)

1. Build agenticmemory Node bindings
2. Create `src/lib/memory/` with types, embeddings, MemoryManager
3. Test memory system in isolation
4. Create `data/` directory and ensure persistence works

### Phase 2: Agent Tools (Day 1-2)

1. Create all tool files in `src/lib/agent/tools/`
2. Create tool registry with OpenAI function format
3. Create system prompt
4. Test tools individually with Bun APIs

### Phase 3: Agent Core (Day 2)

1. Create Agent orchestrator class
2. Implement tool execution loop
3. Implement LLM streaming with tool calls
4. Integrate memory recall into chat flow
5. Test full agent loop

### Phase 4: UI Components (Day 2-3)

1. Create `chat-sidebar.svelte` with history list
2. Create `chat-history-list.svelte`
3. Create `model-selector.svelte`
4. Create `dashboard.svelte` and supporting components
5. Style and test components

### Phase 5: Routes (Day 3)

1. Modify `+layout.svelte` to include sidebar
2. Create `/chat` and `/chat/[id]` pages
3. Create `/history`, `/settings`, `/about` pages
4. Update home page (`+page.svelte`) to dashboard

### Phase 6: API Integration (Day 3)

1. Create `/api/chat` endpoint with memory + tools
2. Create `/api/history` endpoint
3. Create `/api/chat/[id]` endpoints
4. Test full end-to-end flow

### Phase 7: Polishing (Day 4)

1. Error handling improvements
2. Loading states and UX
3. Memory consolidation (periodic summarization)
4. Settings page implementation
5. Documentation

---

## Testing Checklist

- [ ] MemoryManager stores and retrieves messages
- [ ] Semantic search returns relevant results
- [ ] agenticmemory persistence works across restarts
- [ ] Transformers.js model loads and generates embeddings
- [ ] Filesystem tools work (read, write, list, glob)
- [ ] Shell tool executes commands safely
- [ ] Memory tools work (recall, store, get sessions)
- [ ] Tool execution loop terminates correctly
- [ ] Streaming responses render in UI
- [ ] Tool calls are executed and results shown
- [ ] Sidebar shows chat history and updates
- [ ] Creating new chat generates ID and redirects
- [ ] Model selector persists choice
- [ ] Dashboard shows recent chats
- [ ] Full conversation loads when clicking history
- [ ] Delete chat works
- [ ] Error handling for failed tool calls
- [ ] Memory context injected properly

---

## Performance Considerations

- **Embedding generation**: ~50-200ms per message on CPU (all-MiniLM-L6-v2)
- **Vector search**: ~200µs per query (agenticmemory HNSW)
- **Memory size**: ~384 floats per message = ~1.5KB/message
- **Estimated capacity**: 100k messages = ~150MB storage

---

## Security Considerations

- **Shell commands**: Blocked patterns for dangerous operations (`rm -rf /`, `dd`, `format`, `mkfs`, etc.)
- **File access**: Tools can read/write anywhere user has permissions
- **API keys**: OpenRouter key stored in env, not exposed to client
- **Rate limiting**: Not implemented yet - consider adding to API routes
- **User isolation**: Single-user system, no multi-tenancy

---

## Future Enhancements

- Memory consolidation (summarize old conversations)
- Memory pruning (delete low-importance, old entries)
- Memory importance scoring (auto-weight important moments)
- More sophisticated tool permission system
- Web search tool (using a search API)
- Code execution sandbox (Docker container for safe code execution)
- Multi-user support (if needed later)
- Settings page with tool toggles, model defaults
- Export/import memory
- Memory visualization

---

## Completion Criteria

- [ ] Agent can recall past conversations
- [ ] Agent can use tools to manipulate filesystem
- [ ] Sidebar shows chat history
- [ ] New chat creates session
- [ ] Individual chat URLs work
- [ ] Model selector works
- [ ] Home page shows dashboard
- [ ] Full chat history page accessible
- [ ] Memory persists across server restarts
- [ ] Streaming responses work in UI
- [ ] Tool results displayed properly

---

## Estimated Total Implementation Time

**~24-32 hours** of development time split across multiple days.

Breakdown:

- Memory system: 4-5 hours
- Agent tools + orchestrator: 4-6 hours
- UI components: 4-5 hours
- Routes + layout: 2-3 hours
- API integration: 3-4 hours
- Testing + debugging: 4-6 hours
- Polish: 2-3 hours

---

## Questions / Blockers

1. **agenticmemory Node bindings**: Need to verify they work in Bun. If not, may need different approach.
2. **Transformers.js in Bun**: Need to test if `@xenova/transformers` works properly in Bun's environment.
3. **Tool safety**: Current implementation is permissive. Need to confirm this is acceptable for single-user use.
4. **Model selection**: Where should API keys be stored? Current plan uses OPENROUTER_API_KEY env var.

---

End of Plan
