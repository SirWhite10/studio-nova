import {
  getRuntimeControlStatus,
  runtimeControlConfigured,
  runtimeControlStudioId,
} from "./nova-runtime-control";
import { getPrimaryForStudio } from "./surreal-runtime-processes";
import { listArtifactsForStudio } from "./surreal-artifacts";
import { resolveRuntimeState } from "$lib/studios/runtime-state";

function statusFromPods(podsOutput: string) {
  if (!podsOutput.trim()) return "expired" as const;
  if (/Running/i.test(podsOutput)) return "active" as const;
  if (/Init:|Pending|ContainerCreating/i.test(podsOutput)) return "creating" as const;
  return "unhealthy" as const;
}

export async function getStudioRuntimeSnapshot(userId: string, studioId: string) {
  const [primaryProcess, artifacts] = await Promise.all([
    getPrimaryForStudio(userId, studioId).catch(() => null),
    listArtifactsForStudio(userId, studioId, ["preview"]).catch(() => []),
  ]);

  if (!runtimeControlConfigured()) {
    const runtime = resolveRuntimeState({ primaryProcess });
    return {
      controlStudioId: null,
      configured: false,
      primaryProcess,
      artifacts,
      runtime,
      sandboxLike: null,
      status: null,
    };
  }

  const controlStudioId = runtimeControlStudioId(userId, studioId);
  const status = await getRuntimeControlStatus(controlStudioId).catch(() => null);
  const podsOutput =
    status &&
    typeof status === "object" &&
    "result" in status &&
    typeof (status as { result?: { pods?: unknown } }).result?.pods === "string"
      ? (status as { result: { pods: string } }).result.pods
      : "";
  const sandboxStatus = statusFromPods(podsOutput);
  const sandboxLike = {
    status: sandboxStatus,
    sandboxId: controlStudioId,
    lastUsedAt: primaryProcess?.updatedAt,
  };

  return {
    controlStudioId,
    configured: true,
    primaryProcess,
    artifacts,
    runtime: resolveRuntimeState({ sandbox: sandboxLike, primaryProcess }),
    sandboxLike,
    status,
  };
}
