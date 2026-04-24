import type { RequestEvent } from "@sveltejs/kit";
import type { Tool } from "ai";
import { z } from "zod";
import { getUserIdFromLocals } from "$lib/server/surreal-query";
import { getSkillByIdForUser } from "$lib/server/surreal-skills";

const UseSkillInputSchema = z.object({
  skill_id: z.string().describe("The ID of the skill to use"),
  version: z
    .number()
    .optional()
    .describe("Optional specific version number. If omitted, uses the current version."),
});

export function createUseSkillTool(
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
    console.warn("Use skill tool: userId not available");
    return {
      description: "Use a specific skill (unavailable - no auth)",
      inputSchema: UseSkillInputSchema,
      execute: async () => ({ success: false, error: "Use skill unavailable - no authentication" }),
    };
  }

  return {
    description:
      "Retrieve and use a specific skill by ID. Returns the full skill content including instructions. Use this after searching for skills to get the actual skill content you need.",
    inputSchema: UseSkillInputSchema,
    execute: async ({ skill_id, version }) => {
      try {
        const skill = await getSkillByIdForUser(userId, skill_id);

        if (!skill) {
          return { success: false, error: `Skill not found: ${skill_id}` };
        }

        const content = skill.content;
        const skillVersion = version ?? skill.currentVersion ?? 1;

        return {
          success: true,
          result: {
            id: skill_id,
            name: skill.name,
            description: skill.description,
            content: content,
            version: skillVersion,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  };
}
