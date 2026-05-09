import type { RequestEvent } from "@sveltejs/kit";
import { ensureK3sRuntime, K3S_WORKSPACE_PATH } from "$lib/server/k3s-runtime";
import {
  callRuntimeControl,
  getRuntimeControlStatus,
  runtimeControlStudioId,
} from "$lib/server/nova-runtime-control";
import { markPrimaryStopped } from "$lib/server/surreal-runtime-processes";

const WORKSPACE_PATH = K3S_WORKSPACE_PATH;

export class SandboxExpiredError extends Error {
  constructor(message = "Runtime session expired. Please refresh to start a new session.") {
    super(message);
    this.name = "SandboxExpiredError";
  }
}

export interface SandboxRuntimeContext {
  event: RequestEvent;
  userId: string;
  studioId?: string;
  runId?: string;
}

type K3sRuntime = Awaited<ReturnType<typeof ensureK3sRuntime>>;

function requireStudioId(studioId?: string) {
  if (!studioId) {
    throw new Error("K3S runtime requires a Studio id.");
  }
  return studioId;
}

function runtimeIsReady(status: unknown) {
  if (!status || typeof status !== "object" || !("result" in status)) return false;
  const result = (status as { result?: { pods?: unknown } }).result;
  return typeof result?.pods === "string" && /Running/i.test(result.pods);
}

export function getProviderSandboxTimeoutMs(policyTimeoutMs: number) {
  return policyTimeoutMs;
}

export async function getConnectedSandbox(
  context: SandboxRuntimeContext,
): Promise<K3sRuntime | null> {
  if (!context.studioId) return null;
  const controlStudioId = runtimeControlStudioId(context.userId, context.studioId);
  const status = await getRuntimeControlStatus(controlStudioId).catch(() => null);
  if (!runtimeIsReady(status)) return null;
  return ensureK3sRuntime({
    event: context.event,
    userId: context.userId,
    studioId: context.studioId,
  });
}

export async function ensureSandboxForRuntime(context: SandboxRuntimeContext): Promise<K3sRuntime> {
  const studioId = requireStudioId(context.studioId);
  return ensureK3sRuntime({
    event: context.event,
    userId: context.userId,
    studioId,
  });
}

export async function getSandboxForUser(
  event: RequestEvent,
  userId: string,
  studioId?: string,
): Promise<K3sRuntime> {
  return ensureSandboxForRuntime({ event, userId, studioId });
}

export async function disconnectSandbox(
  userId: string,
  _token?: string,
  studioId?: string,
): Promise<void> {
  if (!studioId) return;
  const controlStudioId = runtimeControlStudioId(userId, studioId);
  await callRuntimeControl(controlStudioId, { action: "delete" }).catch((error) => {
    console.warn("Failed to stop k3s runtime:", error);
  });
  await markPrimaryStopped(userId, studioId).catch((error) => {
    console.warn("Failed to mark runtime process stopped:", error);
  });
}

export { WORKSPACE_PATH };
