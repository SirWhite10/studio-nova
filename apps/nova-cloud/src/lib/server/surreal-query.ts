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
  const result = await db.query<[T[]]>(query, { ...params, userId });
  return result[0] ?? [];
}

/**
 * Helper to extract the user ID from event.locals.
 * Returns null if unauthenticated.
 */
export function getUserIdFromLocals(locals: App.Locals): string | null {
  if (locals.userId) return locals.userId;
  const sessionUser = locals.session?.user as
    | { id?: string; userId?: string; _id?: string }
    | undefined;
  return sessionUser?.id ?? sessionUser?.userId ?? sessionUser?._id ?? null;
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
