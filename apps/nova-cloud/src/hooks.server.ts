import { redirect, type Handle } from "@sveltejs/kit";
import { scanAndSeedSkills } from "$lib/server/skill-seeder";
import { ensureTables } from "$lib/server/surreal-tables";
import { surrealGetSession } from "$lib/server/surreal-better-auth";

let seeded = false;

if (!seeded) {
  seeded = true;
  scanAndSeedSkills().catch(console.error);
}

export const handle: Handle = async ({ event, resolve }) => {
  const pathname = event.url.pathname;

  const authToken =
    event.cookies.get("better-auth.session_token") ||
    event.cookies.get("__Secure-better-auth.session_token") ||
    undefined;

  event.locals.token = authToken;

  event.locals.session = null;
  const maybeSession =
    authToken &&
    (pathname.startsWith("/app") || pathname.startsWith("/auth") || pathname.startsWith("/api"))
      ? await surrealGetSession(event.request.headers).catch(() => null)
      : null;

  if (maybeSession?.user) {
    event.locals.session = maybeSession;
    const sessionUser = maybeSession.user as { id?: string; userId?: string; _id?: string };
    event.locals.userId = sessionUser.id ?? sessionUser.userId ?? sessionUser._id ?? null;
  } else {
    event.locals.userId = null;
  }

  if (pathname.startsWith("/app") || pathname.startsWith("/api")) {
    try {
      await ensureTables();
    } catch (err) {
      console.error("Failed to initialize Surreal tables:", err);
    }
  }

  const isAuthenticated = !!event.locals.userId;

  if (pathname.startsWith("/app") && !isAuthenticated) {
    throw redirect(303, "/auth/sign-in");
  }

  if ((pathname === "/auth/sign-in" || pathname === "/auth/sign-up") && isAuthenticated) {
    throw redirect(303, "/app");
  }

  return resolve(event);
};
