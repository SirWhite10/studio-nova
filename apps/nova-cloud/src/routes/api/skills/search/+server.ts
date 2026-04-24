import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { searchSkillsForUser } from "$lib/server/surreal-skills";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const { url } = event;
  const query = url.searchParams.get("q") || "";
  const limit = parseInt(url.searchParams.get("limit") || "3", 10);

  try {
    const results = await searchSkillsForUser(userId, query, limit);
    return json(results);
  } catch {
    return json({ error: "Failed to search skills" }, { status: 500 });
  }
};
