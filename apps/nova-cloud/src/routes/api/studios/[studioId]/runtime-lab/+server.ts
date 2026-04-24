import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getStudioForUser } from "$lib/server/surreal-studios";
import {
  callRuntimeControl,
  getRuntimeControlHealth,
  getRuntimeControlStatus,
  runtimeControlConfigured,
  runtimeControlStudioId,
} from "$lib/server/nova-runtime-control";

type RuntimeLabAction = {
  action: "start" | "delete" | "status" | "exec";
  systemPackages?: string[];
  command?: string;
  timeoutMs?: number;
};

async function resolveControlStudio(event: Parameters<RequestHandler>[0]) {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId ?? "");
  const studio = await getStudioForUser(userId, studioId);
  if (!studio) return null;
  return {
    studio,
    controlStudioId: runtimeControlStudioId(userId, studio._id ?? studioId),
  };
}

export const GET: RequestHandler = async (event) => {
  const context = await resolveControlStudio(event);
  if (!context) return json({ error: "Studio not found" }, { status: 404 });

  try {
    const [health, status] = await Promise.all([
      getRuntimeControlHealth().catch((error) => ({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      })),
      getRuntimeControlStatus(context.controlStudioId).catch((error) => ({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      })),
    ]);

    return json({
      configured: runtimeControlConfigured(),
      controlStudioId: context.controlStudioId,
      health,
      status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 500 });
  }
};

export const POST: RequestHandler = async (event) => {
  const context = await resolveControlStudio(event);
  if (!context) return json({ error: "Studio not found" }, { status: 404 });

  const body: RuntimeLabAction = await event.request.json();
  if (!body.action) return json({ error: "Missing action" }, { status: 400 });
  if (body.action === "exec" && !body.command?.trim()) {
    return json({ error: "Missing command" }, { status: 400 });
  }

  try {
    const result = await callRuntimeControl(
      context.controlStudioId,
      body.action === "exec"
        ? {
            action: "exec",
            command: body.command ?? "",
            timeoutMs: body.timeoutMs,
          }
        : body.action === "start"
          ? {
              action: "start",
              systemPackages: body.systemPackages ?? [],
            }
          : { action: body.action },
    );
    return json({ success: true, controlStudioId: context.controlStudioId, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 500 });
  }
};
