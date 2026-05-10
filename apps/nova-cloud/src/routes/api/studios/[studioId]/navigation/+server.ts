import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createStudioEvent } from "$lib/server/surreal-studio-events";
import { updateStudio } from "$lib/server/surreal-studios";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeNavigationProfile } from "$lib/server/sidebar-state";
import type { StudioNavigationProfile } from "$lib/studios/types";

export const PATCH: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = event.params.studioId;
  const body = (await event.request.json()) as Partial<StudioNavigationProfile>;
  const navigationProfile = normalizeNavigationProfile(body as StudioNavigationProfile);

  try {
    await updateStudio(userId, studioId, {
      navigationProfile,
    });
    await createStudioEvent({
      userId,
      studioId,
      kind: "studio.updated",
      entityType: "studio-navigation",
      entityId: studioId,
      state: "updated",
      summary: "Studio navigation updated",
      payload: {
        navigationProfile,
      },
    });
    return json({
      studioId,
      navigationProfile,
      savedAt: Date.now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 500 });
  }
};
