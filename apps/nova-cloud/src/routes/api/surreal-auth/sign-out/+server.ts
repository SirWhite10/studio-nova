import type { RequestHandler } from "@sveltejs/kit";
import { getSurrealAuth } from "$lib/server/surreal-better-auth";

export const POST: RequestHandler = async (event) => {
  const auth = await getSurrealAuth();
  return auth.api.signOut({
    headers: event.request.headers,
    asResponse: true,
  });
};
