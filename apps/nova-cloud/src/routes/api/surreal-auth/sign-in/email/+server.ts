import type { RequestHandler } from "@sveltejs/kit";
import { getSurrealAuth } from "$lib/server/surreal-better-auth";

export const POST: RequestHandler = async (event) => {
  const auth = await getSurrealAuth();
  const body = await event.request.json();
  return auth.api.signInEmail({
    body,
    headers: event.request.headers,
    asResponse: true,
  });
};
