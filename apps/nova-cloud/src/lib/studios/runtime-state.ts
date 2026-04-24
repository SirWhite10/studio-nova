import type { RuntimeProcessRow } from "$lib/server/surreal-runtime-processes";
import type { SandboxRow } from "$lib/server/surreal-sandbox";

export type RuntimeStatus =
  | "idle"
  | "waking"
  | "active"
  | "paused"
  | "expired"
  | "unhealthy"
  | "limit-reached";

type RuntimeTone = "muted" | "sky" | "emerald" | "amber" | "rose";

type RuntimeSandboxLike = Partial<
  Pick<SandboxRow, "status" | "sandboxId" | "expiresAt" | "lastUsedAt">
> | null;

type RuntimeProcessLike = Partial<
  Pick<RuntimeProcessRow, "status" | "previewUrl" | "updatedAt" | "label">
> | null;

export type RuntimeState = {
  status: RuntimeStatus;
  badgeLabel: string;
  label: string;
  summary: string;
  tone: RuntimeTone;
  canStart: boolean;
  canStop: boolean;
  hasSandbox: boolean;
  sandboxId: string | null;
  expiresAt: number | null;
  lastUsedAt: number | null;
  previewStatus: RuntimeProcessRow["status"] | null;
  previewUrl: string | null;
};

function createRuntimeState(
  status: RuntimeStatus,
  input: { sandbox?: RuntimeSandboxLike; primaryProcess?: RuntimeProcessLike },
): RuntimeState {
  const previewStatus = input.primaryProcess?.status ?? null;
  const previewUrl = input.primaryProcess?.previewUrl ?? null;
  const base = {
    status,
    hasSandbox: !!input.sandbox?.sandboxId,
    sandboxId: input.sandbox?.sandboxId ?? null,
    expiresAt: input.sandbox?.expiresAt ?? null,
    lastUsedAt: input.sandbox?.lastUsedAt ?? null,
    previewStatus,
    previewUrl,
  };

  if (status === "active") {
    return {
      ...base,
      badgeLabel: "active",
      label: previewStatus === "running" ? "Runtime active with preview" : "Runtime active",
      summary:
        previewStatus === "running"
          ? "The Studio runtime is awake and serving a live preview."
          : "The Studio runtime is awake and ready for file edits, tools, and preview work.",
      tone: "emerald",
      canStart: false,
      canStop: true,
    };
  }

  if (status === "waking") {
    return {
      ...base,
      badgeLabel: "waking",
      label: "Runtime waking",
      summary:
        "Nova is provisioning the Studio runtime now. It will become available for commands and preview work shortly.",
      tone: "sky",
      canStart: false,
      canStop: false,
    };
  }

  if (status === "paused") {
    return {
      ...base,
      badgeLabel: "paused",
      label: "Runtime paused",
      summary:
        "The Studio runtime is paused and can be resumed without starting from a fully cold state.",
      tone: "amber",
      canStart: true,
      canStop: false,
    };
  }

  if (status === "expired") {
    return {
      ...base,
      badgeLabel: "sleeping",
      label: "Runtime sleeping",
      summary:
        "The Studio runtime is sleeping. Start it manually here or let Nova wake it only when a task needs execution.",
      tone: "amber",
      canStart: true,
      canStop: false,
    };
  }

  if (status === "unhealthy") {
    return {
      ...base,
      badgeLabel: "unhealthy",
      label: "Runtime unhealthy",
      summary:
        "The Studio runtime record looks inconsistent or unhealthy. Refresh or restart it before relying on runtime tools.",
      tone: "rose",
      canStart: true,
      canStop: true,
    };
  }

  if (status === "limit-reached") {
    return {
      ...base,
      badgeLabel: "limit reached",
      label: "Runtime limit reached",
      summary:
        "Runtime work is blocked by a plan or concurrency limit. Wait for capacity or change the plan before starting again.",
      tone: "rose",
      canStart: false,
      canStop: false,
    };
  }

  return {
    ...base,
    badgeLabel: "idle",
    label: "Runtime idle",
    summary:
      "No runtime is attached to this Studio yet. Nova can wake one on demand when a task needs execution.",
    tone: "muted",
    canStart: true,
    canStop: false,
  };
}

export function resolveRuntimeState(input: {
  sandbox?: RuntimeSandboxLike;
  primaryProcess?: RuntimeProcessLike;
  limitReached?: boolean;
  forceUnhealthy?: boolean;
  now?: number;
}): RuntimeState {
  const now = input.now ?? Date.now();
  const sandbox = input.sandbox ?? null;

  if (input.limitReached) {
    return createRuntimeState("limit-reached", input);
  }

  if (!sandbox) {
    return createRuntimeState("idle", input);
  }

  if (input.forceUnhealthy || !sandbox.sandboxId) {
    return createRuntimeState("unhealthy", input);
  }

  if (sandbox.status === "creating") {
    return createRuntimeState("waking", input);
  }

  if (sandbox.status === "paused") {
    return createRuntimeState("paused", input);
  }

  if (sandbox.status === "unhealthy") {
    return createRuntimeState("unhealthy", input);
  }

  if (sandbox.status === "limit-reached") {
    return createRuntimeState("limit-reached", input);
  }

  if (sandbox.status === "expired") {
    return createRuntimeState("expired", input);
  }

  if (sandbox.status === "active") {
    if (sandbox.expiresAt && sandbox.expiresAt <= now) {
      return createRuntimeState("expired", input);
    }

    return createRuntimeState("active", input);
  }

  return createRuntimeState("idle", input);
}

export function runtimeToneClass(tone: RuntimeState["tone"]) {
  if (tone === "emerald") return "text-emerald-700";
  if (tone === "sky") return "text-sky-700";
  if (tone === "amber") return "text-amber-700";
  if (tone === "rose") return "text-rose-700";
  return "text-muted-foreground";
}
