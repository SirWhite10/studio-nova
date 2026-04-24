import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { requireUserId } from "$lib/server/surreal-query";
import { createStudioEvent } from "$lib/server/surreal-studio-events";
import { updateStudio, deleteStudioForUser, getStudioForUser } from "$lib/server/surreal-studios";

export const PATCH: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = event.params.studioId!;
  const body: { name?: string; description?: string; themeHue?: number } =
    await event.request.json();

  try {
    const updated = await updateStudio(userId, studioId, body);
    await createStudioEvent({
      userId,
      studioId,
      kind: "studio.updated",
      entityType: "studio",
      entityId: updated._id,
      state: "updated",
      summary: "Studio settings updated",
      payload: {
        name: updated.name,
        description: updated.description ?? null,
        themeHue: updated.themeHue ?? null,
      },
    });
    return json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = event.params.studioId!;

  try {
    const deleted = await deleteStudioForUser(userId, studioId);
    if (!deleted) {
      return json({ error: "Studio not found" }, { status: 404 });
    }
    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("not found") || message.includes("permission") ? 404 : 500;
    return json({ error: message }, { status });
  }
};

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = event.params.studioId!;

  try {
    const studio = await getStudioForUser(userId, studioId);
    if (!studio) {
      return json({ error: "Studio not found" }, { status: 404 });
    }
    return json(studio);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 500 });
  }
};
