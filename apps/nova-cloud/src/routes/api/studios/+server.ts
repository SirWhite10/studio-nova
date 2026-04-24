import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { requireUserId } from "$lib/server/surreal-query";
import { createStudioForUser, listStudiosForUser } from "$lib/server/surreal-studios";

const SELECTED_STUDIO_COOKIE = "nova_selected_studio";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studios = await listStudiosForUser(userId);
  return json(studios);
};

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const {
    name,
    description,
    purpose,
    themeHue,
  }: { name?: string; description?: string; purpose?: string; themeHue?: number } =
    await event.request.json();

  const studio = await createStudioForUser({
    userId,
    name: (name || "New Studio").trim(),
    description,
    purpose,
    themeHue,
  });

  event.cookies.set(SELECTED_STUDIO_COOKIE, studio._id, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });

  return json({
    id: studio._id,
    name: studio.name,
  });
};

export const DELETE: RequestHandler = async (event) => {
  event.cookies.delete(SELECTED_STUDIO_COOKIE, { path: "/" });
  return json({ success: true });
};
