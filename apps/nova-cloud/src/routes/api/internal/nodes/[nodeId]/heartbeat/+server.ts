import { json, type RequestHandler } from "@sveltejs/kit";

import { authenticateInternalControl } from "$lib/server/internal-control-auth";
import { heartbeatInfrastructureNode } from "$lib/server/surreal-infrastructure";

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
    const node = await heartbeatInfrastructureNode({
      nodeId: event.params.nodeId ?? "",
      status:
        body.status === "online" || body.status === "degraded" || body.status === "draining"
          ? body.status
          : undefined,
      capabilities: body.capabilities,
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : undefined,
      actorId: auth.actorId,
      requestId: auth.requestId,
    });
    return new Response(null, {
      status: 204,
      headers: { "x-nova-node-status": node.status },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: message.includes("not found") ? 404 : 409 });
  }
};
