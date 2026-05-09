import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { requireUserId } from "$lib/server/surreal-query";
import { markPrimaryStopped } from "$lib/server/surreal-runtime-processes";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { RuntimeLimitError } from "$lib/server/runtime-limits";
import {
  callRuntimeControl,
  runtimeControlConfigured,
  runtimeControlStudioId,
} from "$lib/server/nova-runtime-control";
import { getStudioRuntimeSnapshot } from "$lib/server/runtime-control-state";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = event.url.searchParams.get("studioId");

  if (!studioId) {
    const runtime = {
      status: "idle",
      badgeLabel: "idle",
      label: "Runtime idle",
      summary:
        "No runtime is attached to this Studio yet. Nova can wake one on demand when a task needs execution.",
      tone: "muted",
      canStart: true,
      canStop: false,
      hasSandbox: false,
      sandboxId: null,
      expiresAt: null,
      lastUsedAt: null,
      previewStatus: null,
      previewUrl: null,
    };
    return json({ hasSandbox: false, status: runtime.status, runtime });
  }

  const normalizedStudioId = normalizeRouteParam(studioId);
  const snapshot = await getStudioRuntimeSnapshot(userId, normalizedStudioId);
  const runtime = snapshot.runtime;

  return json({
    hasSandbox: runtime.hasSandbox,
    status: runtime.status,
    runtime,
    sandboxId: snapshot.sandboxLike?.sandboxId ?? null,
    expiresAt: null,
    lastUsedAt: snapshot.sandboxLike?.lastUsedAt ?? null,
    primaryProcess: snapshot.primaryProcess ? { ...snapshot.primaryProcess, _id: undefined } : null,
    artifacts: snapshot.artifacts,
    controlStudioId: snapshot.controlStudioId,
    configured: snapshot.configured,
  });
};

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const body: { action: "start" | "stop" | "refresh"; studioId?: string } =
    await event.request.json();

  const studioId = body.studioId;
  if (!studioId) {
    return json({ error: "Missing studioId" }, { status: 400 });
  }

  const normalizedStudioId = normalizeRouteParam(studioId);

  try {
    if (!runtimeControlConfigured()) {
      return json({ error: "Runtime control is not configured" }, { status: 500 });
    }
    const controlStudioId = runtimeControlStudioId(userId, normalizedStudioId);
    if (body.action === "start") {
      await callRuntimeControl(controlStudioId, {
        action: "start",
        systemPackages: ["git"],
      });
    } else if (body.action === "stop") {
      await callRuntimeControl(controlStudioId, { action: "delete" });
      await markPrimaryStopped(userId, normalizedStudioId).catch(() => {});
    } else if (body.action === "refresh") {
      await callRuntimeControl(controlStudioId, { action: "status" });
    } else {
      return json({ error: `Unknown action: ${String(body.action)}` }, { status: 400 });
    }

    return json({ success: true, action: body.action });
  } catch (error) {
    if (error instanceof RuntimeLimitError) {
      return json(
        { error: error.message, code: error.code, limitReached: true },
        { status: error.status },
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 500 });
  }
};
