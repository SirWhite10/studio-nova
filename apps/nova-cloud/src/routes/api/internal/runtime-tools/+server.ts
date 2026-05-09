import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getPrimaryForStudio, markPrimaryStopped } from "$lib/server/surreal-runtime-processes";
import {
  stopRuntimeControlPreview,
  runtimeControlStudioId,
} from "$lib/server/nova-runtime-control";
import { getStudioRuntimeSnapshot } from "$lib/server/runtime-control-state";

type RuntimeToolRequest = {
  studioId: string;
  toolName: "runtime_dev_logs" | "runtime_dev_stop";
  input: { pid: number };
};

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const body: RuntimeToolRequest = await event.request.json();

  if (!body.studioId || !body.toolName) {
    return json({ error: "Missing studioId or toolName" }, { status: 400 });
  }

  const studioId = normalizeRouteParam(body.studioId);
  const context = { userId, studioId };

  try {
    if (body.toolName === "runtime_dev_logs") {
      return await handleDevLogs(context, body.input.pid);
    }

    if (body.toolName === "runtime_dev_stop") {
      return await handleDevStop(context, body.input.pid);
    }

    return json({ error: `Unknown tool: ${body.toolName as string}` }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, { status: 500 });
  }
};

async function handleDevLogs(context: { userId: string; studioId: string }, pid: number) {
  const primary = await getPrimaryForStudio(context.userId, context.studioId);
  const processId = pid ?? primary?.pid;
  if (!processId) {
    return json({ error: "No primary dev server registered." }, { status: 404 });
  }
  const snapshot = await getStudioRuntimeSnapshot(context.userId, context.studioId);
  const stdout = primary?.logSummary ?? "";
  const stderr = "";

  return json({
    success: true,
    result: {
      pid: processId,
      stdout,
      stderr,
      previewUrl: primary?.previewUrl ?? null,
      runtimeStatus: snapshot.runtime.status,
    },
  });
}

async function handleDevStop(context: { userId: string; studioId: string }, pid: number) {
  const primary = await getPrimaryForStudio(context.userId, context.studioId);
  const processId = pid ?? primary?.pid;
  if (!processId) {
    return json({ error: "No primary dev server registered." }, { status: 404 });
  }

  const controlStudioId = runtimeControlStudioId(context.userId, context.studioId);
  await stopRuntimeControlPreview(controlStudioId, { port: primary?.port ?? processId });
  await markPrimaryStopped(context.userId, context.studioId);

  return json({
    success: true,
    result: { sandboxId: controlStudioId, pid: processId, stopped: true },
  });
}
