import type { RequestHandler } from "@sveltejs/kit";
import { getSurrealAuth } from "$lib/server/surreal-better-auth";

export const POST: RequestHandler = async (event) => {
  console.log("[auth] sign-up endpoint hit");
  const auth = await getSurrealAuth();
  const body = await event.request.json();
  console.log("[auth] sign-up body received", { email: body?.email });
  return auth.api.signUpEmail({
    body,
    headers: event.request.headers,
    asResponse: true,
  });
};
