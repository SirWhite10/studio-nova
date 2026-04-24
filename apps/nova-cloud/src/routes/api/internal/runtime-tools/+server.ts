import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getConnectedSandbox } from "$lib/server/sandbox";
import {
  getPrimaryForStudio,
  upsertPrimaryForStudio,
  markPrimaryStopped,
} from "$lib/server/surreal-runtime-processes";

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
  const context = { event, userId, studioId };

  const sandbox = await getConnectedSandbox(context);
  if (!sandbox) {
    return json({ error: "No active sandbox found. Wake the runtime first." }, { status: 404 });
  }

  try {
    if (body.toolName === "runtime_dev_logs") {
      return await handleDevLogs(context, sandbox, body.input.pid);
    }

    if (body.toolName === "runtime_dev_stop") {
      return await handleDevStop(context, sandbox, body.input.pid);
    }

    return json({ error: `Unknown tool: ${body.toolName as string}` }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, { status: 500 });
  }
};

async function handleDevLogs(
  context: { userId: string; studioId: string },
  sandbox: any,
  pid: number,
) {
  const primary = await getPrimaryForStudio(context.userId, context.studioId);
  const processId = pid ?? primary?.pid;
  if (!processId) {
    return json({ error: "No primary dev server registered." }, { status: 404 });
  }

  let stdout = "";
  let stderr = "";
  const handle = await sandbox.commands.connect(processId, {
    timeoutMs: 5000,
    onStdout: (data: string) => {
      stdout += data;
    },
    onStderr: (data: string) => {
      stderr += data;
    },
  });

  await Promise.race([handle.wait(), new Promise((resolve) => setTimeout(resolve, 5000))]);

  await upsertPrimaryForStudio(context.userId, context.studioId, {
    sandboxId: sandbox.sandboxId,
    label: primary?.label ?? "Primary Preview",
    command: primary?.command ?? "unknown",
    cwd: primary?.cwd ?? ".",
    pid: processId,
    port: primary?.port,
    previewUrl: primary?.previewUrl,
    status: primary?.status ?? "running",
    logSummary: (stdout || stderr).slice(-2000),
  });

  return json({
    success: true,
    result: { pid: processId, stdout, stderr, previewUrl: primary?.previewUrl ?? null },
  });
}

async function handleDevStop(
  context: { userId: string; studioId: string },
  sandbox: any,
  pid: number,
) {
  const primary = await getPrimaryForStudio(context.userId, context.studioId);
  const processId = pid ?? primary?.pid;
  if (!processId) {
    return json({ error: "No primary dev server registered." }, { status: 404 });
  }

  await sandbox.commands.kill(processId);
  await markPrimaryStopped(context.userId, context.studioId);

  return json({
    success: true,
    result: { sandboxId: sandbox.sandboxId, pid: processId, stopped: true },
  });
}
