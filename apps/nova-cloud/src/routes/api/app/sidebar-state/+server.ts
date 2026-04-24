import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { getSidebarState } from "$lib/server/sidebar-state";

const SELECTED_STUDIO_COOKIE = "nova_selected_studio";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const requestedStudioId = event.url.searchParams.get("studioId");
  const persistedStudioId = event.cookies.get(SELECTED_STUDIO_COOKIE) ?? null;

  const state = await getSidebarState(userId, {
    requestedStudioId,
    persistedStudioId,
  });

  if (state.currentStudio?.id) {
    event.cookies.set(SELECTED_STUDIO_COOKIE, state.currentStudio.id, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });
  }

  return json(state);
};
