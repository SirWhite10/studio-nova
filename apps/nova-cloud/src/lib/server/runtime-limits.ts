import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getUserPlan } from "$lib/server/surreal-plans";
import { listSandboxesForUser } from "$lib/server/surreal-sandbox";
import { listActiveRunsForStudio } from "$lib/server/surreal-chat-runs";

export type RuntimePlan = "free" | "pro";

export type RuntimePolicy = {
  plan: RuntimePlan;
  label: string;
  sandboxTimeoutMs: number;
  maxActiveSandboxes: number;
  maxConcurrentRunsPerStudio: number;
  maxRunDurationMs: number;
  maxToolSteps: number;
  summary: string;
};

const RUNTIME_POLICIES: Record<RuntimePlan, RuntimePolicy> = {
  free: {
    plan: "free",
    label: "Free",
    sandboxTimeoutMs: 60 * 60 * 1000,
    maxActiveSandboxes: 1,
    maxConcurrentRunsPerStudio: 1,
    maxRunDurationMs: 5 * 60 * 1000,
    maxToolSteps: 20,
    summary:
      "1 active runtime, 1 hour sandbox sessions, 1 active run per Studio, 20 tool steps per run.",
  },
  pro: {
    plan: "pro",
    label: "Pro",
    sandboxTimeoutMs: 24 * 60 * 60 * 1000,
    maxActiveSandboxes: 3,
    maxConcurrentRunsPerStudio: 1,
    maxRunDurationMs: 15 * 60 * 1000,
    maxToolSteps: 40,
    summary:
      "Up to 3 active runtimes, 24 hour sandbox sessions, 1 active run per Studio, 40 tool steps per run.",
  },
};

export class RuntimeLimitError extends Error {
  code: "runtime_limit_reached" | "studio_run_limit_reached";
  status: number;

  constructor(
    message: string,
    code: RuntimeLimitError["code"] = "runtime_limit_reached",
    status = 429,
  ) {
    super(message);
    this.name = "RuntimeLimitError";
    this.code = code;
    this.status = status;
  }
}

export async function getRuntimePolicyForUser(userId: string): Promise<RuntimePolicy> {
  const planInfo = await getUserPlan(userId);
  const plan = planInfo?.plan === "pro" ? "pro" : "free";
  return RUNTIME_POLICIES[plan];
}

export function getRuntimePolicyForPlan(plan?: string | null): RuntimePolicy {
  return plan === "pro" ? RUNTIME_POLICIES.pro : RUNTIME_POLICIES.free;
}

export async function assertRuntimeStartAllowed(userId: string, studioId?: string) {
  const policy = await getRuntimePolicyForUser(userId);
  const sandboxes = await listSandboxesForUser(userId).catch(() => []);
  const normalizedStudioId = studioId ? normalizeRouteParam(studioId) : null;

  const activeSandboxes = sandboxes.filter((sandbox) => {
    const isSameStudio = normalizedStudioId && sandbox.studioId === normalizedStudioId;
    return (
      !isSameStudio &&
      (sandbox.status === "active" ||
        sandbox.status === "creating" ||
        sandbox.status === "paused" ||
        sandbox.status === "unhealthy")
    );
  });

  if (activeSandboxes.length >= policy.maxActiveSandboxes) {
    throw new RuntimeLimitError(
      `Your ${policy.label} plan allows ${policy.maxActiveSandboxes} active runtime${policy.maxActiveSandboxes === 1 ? "" : "s"} at a time. Sleep another Studio runtime before starting a new one.`,
      "runtime_limit_reached",
    );
  }

  return policy;
}

export async function assertStudioRunAllowed(userId: string, studioId?: string | null) {
  const policy = await getRuntimePolicyForUser(userId);
  if (!studioId) return policy;

  const activeRuns = await listActiveRunsForStudio(userId, studioId);
  if (activeRuns.length >= policy.maxConcurrentRunsPerStudio) {
    throw new RuntimeLimitError(
      "Nova is already working on another request for this Studio. Wait for that run to finish or stop it before starting a new one.",
      "studio_run_limit_reached",
      409,
    );
  }

  return policy;
}
