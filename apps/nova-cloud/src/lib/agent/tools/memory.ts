import type { RequestEvent } from "@sveltejs/kit";
import type { Tool } from "ai";
import { z } from "zod";
import {
  addMemoryForUser,
  getMemoriesByUser,
  searchMemoriesForUser,
} from "$lib/server/surreal-memory";
import { getUserIdFromLocals } from "$lib/server/surreal-query";

const MemoryInputSchema = z.object({
  operation: z.enum(["store", "search", "get"]),
  content: z.string().optional(),
  query: z.string().optional(),
  id: z.string().optional(),
  limit: z.number().default(5),
  type: z.enum(["conversation", "tool_use", "fact"]).default("fact"),
  chatId: z.string().optional(),
});

export function createMemoryTool(
  eventOrToken: RequestEvent | string | null,
  _userId?: string,
): Tool {
  const userId =
    _userId ||
    (typeof eventOrToken === "string"
      ? null
      : eventOrToken
        ? getUserIdFromLocals(eventOrToken.locals as App.Locals)
        : null);

  if (!userId) {
    console.warn("Memory tool: userId not available");
    return {
      description: "Memory tool (unavailable - no auth)",
      inputSchema: MemoryInputSchema,
      execute: async () => ({
        success: false,
        error: "Memory tool unavailable - no authentication",
      }),
    };
  }

  return {
    description:
      "Store and retrieve information from the long-term memory system. Memory is automatically embedded for semantic search. Use this to remember facts, user preferences, important information, and past conversation context.",
    inputSchema: MemoryInputSchema,
    execute: async ({ operation, content, query, limit, type, chatId }) => {
      try {
        switch (operation) {
          case "store": {
            if (!content) {
              return {
                success: false,
                error: "Content required for store operation",
              };
            }
            await addMemoryForUser(userId, content, { type, chatId });
            return { success: true, result: { message: "Stored in memory" } };
          }
          case "search": {
            if (!query) {
              return {
                success: false,
                error: "Query required for search operation",
              };
            }
            const results = await searchMemoriesForUser(userId, query, limit ?? 5);
            return {
              success: true,
              result: {
                memories: results.map((r: any) => ({
                  id: r.entry._id,
                  content: r.entry.content,
                  score: r.score,
                  metadata: r.entry.metadata,
                })),
              },
            };
          }
          case "get": {
            if (!chatId) {
              return {
                success: false,
                error: "chatId required for get operation",
              };
            }
            const memories = await getMemoriesByUser(userId, chatId);
            return {
              success: true,
              result: {
                memories: memories.map((m: any) => ({
                  id: m._id,
                  content: m.content,
                  metadata: m.metadata,
                })),
              },
            };
          }
          default:
            return { success: false, error: `Unknown operation: ${operation}` };
        }
      } catch (error: unknown) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}
