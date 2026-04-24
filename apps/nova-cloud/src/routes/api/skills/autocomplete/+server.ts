import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { listSkillsByUser } from "$lib/server/surreal-skills";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const { url } = event;
  const query = url.searchParams.get("q")?.toLowerCase() || "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10), 10);

  const enabledSkills = await listSkillsByUser(userId, true);

  if (query) {
    const filtered = enabledSkills.filter(
      (s: any) =>
        s.name.toLowerCase().includes(query) || s.description?.toLowerCase().includes(query),
    );
    return json(filtered.slice(0, limit));
  }

  return json(enabledSkills.slice(0, limit));
};
