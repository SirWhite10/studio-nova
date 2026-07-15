import { json, type RequestHandler } from "@sveltejs/kit";

import { authenticateInternalControl } from "$lib/server/internal-control-auth";
import { reconcileStaleInfrastructure } from "$lib/server/surreal-infrastructure";

export const POST: RequestHandler = async (event) => {
  const auth = authenticateInternalControl(event);
  if (!auth.ok) {
    return json(
      { error: auth.configured ? "Unauthorized" : "Constellation control token is not configured" },
      { status: auth.configured ? 401 : 503 },
    );
  }
  const body = (await event.request.json().catch(() => ({}))) as { staleAfterMs?: unknown };
  const staleAfterMs =
    typeof body.staleAfterMs === "number" && Number.isFinite(body.staleAfterMs)
      ? body.staleAfterMs
      : undefined;
  return json({
    ok: true,
    ...(await reconcileStaleInfrastructure({
      staleAfterMs,
      actorId: auth.actorId,
      requestId: auth.requestId,
    })),
  });
};
