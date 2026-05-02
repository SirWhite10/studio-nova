import { redirect, type Handle } from "@sveltejs/kit";
import { getUserIdFromLocals } from "$lib/server/surreal-query";
import { scanAndSeedSkills } from "$lib/server/skill-seeder";
import { ensureTables } from "$lib/server/surreal-tables";

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
  event.locals.userId = getUserIdFromLocals({ token: authToken } as App.Locals) || null;
  event.locals.session = null;

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
