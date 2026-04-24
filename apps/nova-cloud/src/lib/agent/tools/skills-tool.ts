import type { RequestEvent } from "@sveltejs/kit";
import type { Tool } from "ai";
import { z } from "zod";
import { getUserIdFromLocals } from "$lib/server/surreal-query";
import { listSkillsByUser, searchSkillsForUser } from "$lib/server/surreal-skills";

const SkillsInputSchema = z.object({
  query: z.string().optional(),
  limit: z.number().default(3).optional(),
});

export function createSkillsTool(
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
    console.warn("Skills tool: userId not available");
    return {
      description: "Search for custom skills or list all available skills (unavailable - no auth)",
      inputSchema: SkillsInputSchema,
      execute: async () => ({
        success: false,
        error: "Skills tool unavailable - no authentication",
      }),
    };
  }

  return {
    description:
      "Search for custom skills or list all available skills. Skills are AI capabilities that can help with specific tasks. Use this to discover what skills are available or to find skills relevant to a particular topic.",
    inputSchema: SkillsInputSchema,
    execute: async ({ query, limit }) => {
      try {
        let results;
        if (query && typeof query === "string" && query.trim()) {
          const searchResults = await searchSkillsForUser(userId, query, limit ?? 3);
          results = (searchResults as any[]).map((r: any) => r.skill);
        } else {
          results = await listSkillsByUser(userId, true);
        }
        return {
          success: true,
          result: {
            skills: results.map((s: any) => ({
              id: s._id,
              name: s.name,
              description: s.description,
              content: s.content,
            })),
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  };
}
