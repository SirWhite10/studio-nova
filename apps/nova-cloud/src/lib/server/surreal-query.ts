import { getSurreal } from "./surreal";

/**
 * Execute a Surreal query scoped to the authenticated user.
 * Injects $userId as a bind parameter automatically.
 * Never trust client-provided user IDs.
 */
export async function surrealQueryAsUser<T = unknown>(
  userId: string,
  query: string,
  params?: Record<string, unknown>,
): Promise<T[]> {
  if (!userId) throw new Error("surrealQueryAsUser: missing userId");
  const db = await getSurreal();
  const result = await db.query<[T[]]>(query, { ...params, userId }).collect();
  return result[0] ?? [];
}

/**
 * Helper to extract the user ID from event.locals.
 * Currently derives it from the Convex/Better Auth token subject.
 * Returns null if unauthenticated.
 */
export function getUserIdFromLocals(locals: App.Locals): string | null {
  if (locals.userId) return locals.userId;
  const token = locals.token;
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(payload, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as { sub?: string };
    return parsed.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Guard that throws if no authenticated user.
 * Returns the userId string for use in Surreal queries.
 */
export function requireUserId(locals: App.Locals): string {
  const userId = getUserIdFromLocals(locals);
  if (!userId) throw new Error("Unauthorized");
  return userId;
}
