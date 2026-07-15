import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { getSurreal, getSurrealStatus } from "$lib/server/surreal";
import { getUserIdFromLocals } from "$lib/server/surreal-query";
import { getSurrealSchemaReport } from "$lib/server/surreal-schema";
import { getConstellationReadiness } from "$lib/server/surreal-infrastructure";

async function healthPayload(connection: string, ping?: string) {
  const schema = await getSurrealSchemaReport();
  const platform =
    schema.mode === "versioned"
      ? await getConstellationReadiness().catch((error) => ({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }))
      : { ok: true, skipped: "Versioned Constellation schema is not active" };
  const ok = schema.compatible && platform.ok;
  return {
    status: ok ? "ok" : "error",
    connection,
    ...(ping ? { ping } : {}),
    checks: { schema, platform },
    schema,
    platform,
    ok,
  };
}

export const GET: RequestHandler = async (event) => {
  const userId = getUserIdFromLocals(event.locals);
  if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

  const status = getSurrealStatus();

  if (status === "connected") {
    const payload = await healthPayload(status);
    return json(payload, { status: payload.ok ? 200 : 503 });
  }

  try {
    const db = await getSurreal();
    const [result] = await db.query<[string]>("RETURN 'pong'");
    const payload = await healthPayload(db.status, result);
    return json(payload, { status: payload.ok ? 200 : 503 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json(
      { status: "error", connection: getSurrealStatus(), error: message },
      { status: 503 },
    );
  }
};
