import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { requireUserId } from "$lib/server/surreal-query";
import { getSandboxForStudio } from "$lib/server/surreal-sandbox";
import { getPrimaryForStudio } from "$lib/server/surreal-runtime-processes";
import { listArtifactsForStudio } from "$lib/server/surreal-artifacts";
import {
  getConnectedSandbox,
  ensureSandboxForRuntime,
  disconnectSandbox,
} from "$lib/server/sandbox";

import { normalizeRouteParam } from "$lib/server/surreal-records";
import { resolveRuntimeState } from "$lib/studios/runtime-state";
import { RuntimeLimitError } from "$lib/server/runtime-limits";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = event.url.searchParams.get("studioId");

  if (!studioId) {
    const runtime = resolveRuntimeState({});
    return json({ hasSandbox: false, status: runtime.status, runtime });
  }

  const normalizedStudioId = normalizeRouteParam(studioId);
  const [sandboxRecord, primaryProcess, artifacts] = await Promise.all([
    getSandboxForStudio(userId, normalizedStudioId).catch(() => null),
    getPrimaryForStudio(userId, normalizedStudioId).catch(() => null),
    listArtifactsForStudio(userId, normalizedStudioId, ["preview"]).catch(() => []),
  ]);

  const runtime = resolveRuntimeState({ sandbox: sandboxRecord, primaryProcess });

  return json({
    hasSandbox: runtime.hasSandbox,
    status: runtime.status,
    runtime,
    sandboxId: sandboxRecord?.sandboxId ?? null,
    expiresAt: sandboxRecord?.expiresAt ?? null,
    lastUsedAt: sandboxRecord?.lastUsedAt ?? null,
    primaryProcess: primaryProcess ? { ...primaryProcess, _id: undefined } : null,
    artifacts,
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

  const context = {
    event,
    userId,
    studioId: normalizedStudioId,
  };

  try {
    if (body.action === "start") {
      await ensureSandboxForRuntime(context);
    } else if (body.action === "stop") {
      await disconnectSandbox(userId, undefined, normalizedStudioId);
    } else if (body.action === "refresh") {
      const sandbox = await getConnectedSandbox(context);
      if (!sandbox) {
        return json({ error: "No active sandbox found" }, { status: 404 });
      }
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
