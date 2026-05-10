import type { LayoutServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { getSidebarState } from "$lib/server/sidebar-state";

const SELECTED_STUDIO_COOKIE = "nova_selected_studio";

export const load: LayoutServerLoad = async (event) => {
  const userId = event.locals.userId;
  if (!userId) {
    throw redirect(303, "/auth/sign-in");
  }

  const routeStudioId = event.params.studioId ?? null;
  const requestedStudioId =
    routeStudioId ?? (event.url.searchParams.get("studio") as string | null);
  const persistedStudioId = event.cookies.get(SELECTED_STUDIO_COOKIE) ?? null;
  const sidebarState = await getSidebarState(userId, {
    requestedStudioId,
    persistedStudioId,
    userProfile: {
      name: event.locals.session?.user?.name ?? null,
      email: event.locals.session?.user?.email ?? null,
      avatar: null,
    },
  });

  if (sidebarState.currentStudio?.id) {
    event.cookies.set(SELECTED_STUDIO_COOKIE, sidebarState.currentStudio.id, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });
  }

  return {
    data: sidebarState,
  };
};

export const ssr = false;
