import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { searchAppShell } from "$lib/server/app-search";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const query = event.url.searchParams.get("q") ?? "";
  const studioId = event.url.searchParams.get("studioId");
  const limit = Number.parseInt(event.url.searchParams.get("limit") ?? "12", 10);

  const payload = await searchAppShell({
    userId,
    query,
    selectedStudioId: studioId,
    limit: Number.isFinite(limit) ? limit : 12,
  });

  return json(payload);
};
