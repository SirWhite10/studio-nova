import type { RequestHandler } from "@sveltejs/kit";
import { getSurrealAuth } from "$lib/server/surreal-better-auth";

export const GET: RequestHandler = async (event) => {
  const auth = await getSurrealAuth();
  return auth.api.getSession({
    headers: event.request.headers,
    asResponse: true,
  });
};
