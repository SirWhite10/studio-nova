import { json, type RequestHandler } from "@sveltejs/kit";

import { authenticateInternalControl } from "$lib/server/internal-control-auth";
import { registerInfrastructureNode } from "$lib/server/surreal-infrastructure";

export const POST: RequestHandler = async (event) => {
  const auth = authenticateInternalControl(event);
  if (!auth.ok) {
    return json(
      { error: auth.configured ? "Unauthorized" : "Constellation control token is not configured" },
      { status: auth.configured ? 401 : 503 },
    );
  }
  const body = (await event.request.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const result = await registerInfrastructureNode({
      constellationKey: event.params.constellationKey ?? "",
      constellationName:
        typeof body.constellationName === "string" ? body.constellationName : undefined,
      nodeKey: typeof body.nodeKey === "string" ? body.nodeKey : "",
      role: body.role as "forge" | "horizon" | "habitat",
      displayName: typeof body.displayName === "string" ? body.displayName : "",
      hostname: typeof body.hostname === "string" ? body.hostname : "",
      region: typeof body.region === "string" ? body.region : undefined,
      capabilities: body.capabilities,
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : undefined,
      actorId: auth.actorId,
      requestId: auth.requestId,
    });
    return json({ ok: true, ...result }, { status: result.created ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const conflict = message.includes("immutable") || message.includes("retired");
    return json({ error: message }, { status: conflict ? 409 : 400 });
  }
};
