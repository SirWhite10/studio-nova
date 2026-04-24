import { redirect, type Handle } from "@sveltejs/kit";
import { surrealGetSession } from "$lib/server/surreal-better-auth";
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

  try {
    await ensureTables();
  } catch (err) {
    console.error("Failed to initialize Surreal tables:", err);
  }

  let session;
  try {
    const result = await surrealGetSession(event.request.headers);
    session = result?.user ? { user: result.user } : null;
  } catch (err: any) {
    console.warn("Surreal auth session failed:", err);
    session = null;
  }

  event.locals.session = session;
  event.locals.userId =
    session?.user?.id ||
    getUserIdFromLocals({ token: event.cookies.get("better-auth.session_token") } as App.Locals) ||
    null;

  const isAuthenticated = !!event.locals.userId;

  if (pathname.startsWith("/app") && !isAuthenticated) {
    throw redirect(303, "/auth/sign-in");
  }

  if ((pathname === "/auth/sign-in" || pathname === "/auth/sign-up") && isAuthenticated) {
    throw redirect(303, "/app");
  }

  return resolve(event);
};
