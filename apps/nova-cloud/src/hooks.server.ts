import { redirect, type Handle } from "@sveltejs/kit";
import { scanAndSeedSkills } from "$lib/server/skill-seeder";
import { surrealGetSession } from "$lib/server/surreal-better-auth";
import { assertSurrealSchemaCompatible } from "$lib/server/surreal-schema";

let seeded = false;

if (!seeded) {
  seeded = true;
  scanAndSeedSkills().catch(console.error);
}

export const handle: Handle = async ({ event, resolve }) => {
  const pathname = event.url.pathname;
  const isAuthPath = pathname.startsWith("/auth");
  const isApiPath = pathname.startsWith("/api");
  const isLegacyLandingPath =
    pathname === "/landing" ||
    pathname.startsWith("/landing/") ||
    pathname === "/pricing" ||
    pathname.startsWith("/pricing/") ||
    pathname === "/about" ||
    pathname.startsWith("/about/");
  const isAppPath =
    pathname === "/" ||
    pathname === "/chats" ||
    pathname.startsWith("/chats/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/skills" ||
    pathname.startsWith("/skills/") ||
    pathname === "/studios" ||
    pathname.startsWith("/studios/");

  const authToken =
    event.cookies.get("better-auth.session_token") ||
    event.cookies.get("__Secure-better-auth.session_token") ||
    undefined;

  event.locals.token = authToken;

  event.locals.session = null;
  const maybeSession =
    authToken && (isAppPath || isAuthPath || isApiPath)
      ? await surrealGetSession(event.request.headers).catch(() => null)
      : null;

  if (maybeSession?.user) {
    event.locals.session = maybeSession;
    const sessionUser = maybeSession.user as { id?: string; userId?: string; _id?: string };
    event.locals.userId = sessionUser.id ?? sessionUser.userId ?? sessionUser._id ?? null;
  } else {
    event.locals.userId = null;
  }

  if (isAppPath || isApiPath) {
    try {
      await assertSurrealSchemaCompatible();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("SurrealDB schema compatibility check failed:", message);
      return new Response(
        JSON.stringify({ error: "Database schema is unavailable", detail: message }),
        {
          status: 503,
          headers: { "content-type": "application/json" },
        },
      );
    }
  }

  const isAuthenticated = !!event.locals.userId;

  if (isAppPath && !isAuthenticated) {
    throw redirect(303, "/auth/sign-in");
  }

  if (isLegacyLandingPath) {
    throw redirect(308, "/");
  }

  if ((pathname === "/auth/sign-in" || pathname === "/auth/sign-up") && isAuthenticated) {
    throw redirect(303, "/");
  }

  return resolve(event);
};
