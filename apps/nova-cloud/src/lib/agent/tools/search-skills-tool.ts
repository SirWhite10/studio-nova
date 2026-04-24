import type { RequestEvent } from "@sveltejs/kit";
import type { Tool } from "ai";
import { z } from "zod";
import { getUserIdFromLocals } from "$lib/server/surreal-query";
import { searchSkillsForUser } from "$lib/server/surreal-skills";

const SearchSkillsInputSchema = z.object({
  query: z.string().optional(),
  limit: z.number().min(1).max(20).default(5).optional(),
});

export function createSearchSkillsTool(
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
    console.warn("Search skills tool: userId not available");
    return {
      description: "Search for skills (unavailable - no auth)",
      inputSchema: SearchSkillsInputSchema,
      execute: async () => ({
        success: false,
        error: "Search skills unavailable - no authentication",
      }),
    };
  }

  return {
    description:
      "Search for custom skills or list all available skills. Returns skill metadata (id, name, description, version) without content. Use this to discover what skills are available or to find skills relevant to a particular topic.",
    inputSchema: SearchSkillsInputSchema,
    execute: async ({ query, limit }) => {
      try {
        const results = await searchSkillsForUser(userId, query ?? "", limit ?? 5);

        return {
          success: true,
          result: {
            skills: (results as any[]).map((r: any) => ({
              id: r.skill._id,
              name: r.skill.name,
              description: r.skill.description,
              version: r.skill.currentVersion || 1,
              usage_count: r.skill.usageCount || 0,
              success_rate:
                r.skill.usageCount && r.skill.usageCount > 0
                  ? (r.skill.successCount || 0) / r.skill.usageCount
                  : 0,
            })),
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  };
}
