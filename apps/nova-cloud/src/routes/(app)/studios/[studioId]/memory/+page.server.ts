import type { PageServerLoad } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { searchMemoriesForUser, getMemoriesByUser } from "$lib/server/surreal-memory";
import { getStudioForUser } from "$lib/server/surreal-studios";

export const load: PageServerLoad = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const query = event.url.searchParams.get("q")?.trim() ?? "";

  const [studio, recentMemories, searchedMemories] = await Promise.all([
    getStudioForUser(userId, studioId),
    getMemoriesByUser(userId),
    query ? searchMemoriesForUser(userId, query, 12) : Promise.resolve([]),
  ]);

  return {
    studio,
    studioId,
    query,
    recentMemories: recentMemories.slice(0, 16),
    searchedMemories,
  };
};

export const ssr = false;
