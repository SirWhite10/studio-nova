import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { getSurreal, getSurrealStatus } from "$lib/server/surreal";
import { getUserIdFromLocals } from "$lib/server/surreal-query";

export const GET: RequestHandler = async (event) => {
  const userId = getUserIdFromLocals(event.locals);
  if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

  const status = getSurrealStatus();

  if (status === "connected") {
    return json({ status: "ok", connection: status });
  }

  try {
    const db = await getSurreal();
    const [result] = await db.query<[string]>("RETURN 'pong'");
    return json({ status: "ok", connection: db.status, ping: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json(
      { status: "error", connection: getSurrealStatus(), error: message },
      { status: 503 },
    );
  }
};
