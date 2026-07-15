import { randomUUID } from "node:crypto";

import {
  assertTransition,
  DEPLOYMENT_TRANSITIONS,
  RUNTIME_INSTANCE_TRANSITIONS,
  type DeploymentStatus,
  type RuntimeInstanceStatus,
} from "@studio-nova/data-contracts";
import { StringRecordId } from "surrealdb";

import { getSurreal } from "./surreal";
import { appendAuditEvent, type AuditActorType } from "./surreal-audit";
import {
  normalizeRouteParam,
  normalizeSurrealRow,
  normalizeSurrealRows,
  queryRows,
  tableRecordId,
} from "./surreal-records";
import { getReleaseForUser, type ReleaseRow } from "./surreal-releases";
import { getStudioForUser } from "./surreal-studios";

export type DeploymentEnvironment = "preview" | "staging" | "production";

export type DeploymentRow = {
  id: unknown;
  _id: string;
  userId: string;
  studioId: string;
  environment: DeploymentEnvironment;
  releaseId: string;
  previousReleaseId?: string | null;
  status: DeploymentStatus;
  activeRuntimeInstanceId?: string | null;
  legacyDeploymentId?: string | null;
  activatedAt?: Date | string | null;
  failure?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type RuntimeInstanceRow = {
  id: unknown;
  _id: string;
  deploymentId: string;
  nodeId: string;
  provider: string;
  providerInstanceId: string;
  status: RuntimeInstanceStatus;
  serviceKey: string;
  healthCheck: Record<string, unknown>;
  legacyRuntimeProcessId?: string | null;
  startedAt?: Date | string | null;
  stoppedAt?: Date | string | null;
  failure?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export function isDeploymentEnvironment(value: string): value is DeploymentEnvironment {
  return ["preview", "staging", "production"].includes(value);
}

export function deploymentHealthGate(
  deployment: Pick<DeploymentRow, "_id" | "status">,
  runtime: Pick<RuntimeInstanceRow, "deploymentId" | "status"> | null,
) {
  if (!runtime) return { allowed: false, reason: "Deployment has no Runtime Instance" };
  if (normalizeRouteParam(runtime.deploymentId) !== normalizeRouteParam(deployment._id)) {
    return { allowed: false, reason: "Runtime Instance belongs to a different Deployment" };
  }
  if (runtime.status !== "healthy") {
    return { allowed: false, reason: `Runtime Instance is ${runtime.status}` };
  }
  if (!["ready", "activating", "active"].includes(deployment.status)) {
    return { allowed: false, reason: `Deployment is ${deployment.status}` };
  }
  return { allowed: true, reason: null };
}

export function selectRollbackRelease(
  deployment: Pick<DeploymentRow, "releaseId" | "previousReleaseId">,
  requestedReleaseId?: string,
) {
  const requested = requestedReleaseId ? normalizeRouteParam(requestedReleaseId) : null;
  const previous = deployment.previousReleaseId
    ? normalizeRouteParam(deployment.previousReleaseId)
    : null;
  const current = normalizeRouteParam(deployment.releaseId);
  const selected = requested ?? previous;
  if (!selected) throw new Error("Deployment has no previous Release to roll back to");
  if (selected === current) throw new Error("Rollback Release must differ from the active Release");
  return selected;
}

export async function getDeploymentForUser(userId: string, deploymentId: string) {
  const db = await getSurreal();
  const rows = await queryRows<DeploymentRow>(
    db,
    "SELECT * FROM deployment WHERE id = $deploymentId LIMIT 1",
    { deploymentId: tableRecordId("deployment", normalizeRouteParam(deploymentId)) },
  );
  if (!rows[0] || rows[0].userId !== userId) return null;
  return normalizeSurrealRow<DeploymentRow>(rows[0]);
}

export async function listDeploymentsForStudio(userId: string, studioId: string) {
  const db = await getSurreal();
  const rows = await queryRows<DeploymentRow>(
    db,
    "SELECT * FROM deployment WHERE userId = $userId AND studioId = $studioId ORDER BY createdAt DESC",
    { userId, studioId: tableRecordId("studio", normalizeRouteParam(studioId)) },
  );
  return normalizeSurrealRows<DeploymentRow>(rows);
}

async function activeDeploymentForEnvironment(
  userId: string,
  studioId: string,
  environment: DeploymentEnvironment,
  excludeDeploymentId?: string,
) {
  const db = await getSurreal();
  const rows = await queryRows<DeploymentRow>(
    db,
    "SELECT * FROM deployment WHERE userId = $userId AND studioId = $studioId AND environment = $environment AND status = 'active' ORDER BY activatedAt DESC",
    {
      userId,
      studioId: tableRecordId("studio", normalizeRouteParam(studioId)),
      environment,
    },
  );
  const normalized = normalizeSurrealRows<DeploymentRow>(rows);
  return (
    normalized.find(
      (candidate) => candidate._id !== normalizeRouteParam(excludeDeploymentId ?? ""),
    ) ?? null
  );
}

export async function createDeployment(input: {
  userId: string;
  studioId: string;
  releaseId: string;
  environment: DeploymentEnvironment;
}) {
  if (!isDeploymentEnvironment(input.environment))
    throw new Error("Invalid Deployment environment");
  const studio = await getStudioForUser(input.userId, input.studioId);
  if (!studio) throw new Error("Studio not found");
  const release = await getReleaseForUser(input.userId, input.releaseId);
  if (!release || normalizeRouteParam(release.studioId) !== normalizeRouteParam(input.studioId)) {
    throw new Error("Release not found");
  }
  if (release.status !== "ready") throw new Error("Only a ready Release can be deployed");

  const db = await getSurreal();
  const existingRows = await queryRows<DeploymentRow>(
    db,
    "SELECT * FROM deployment WHERE userId = $userId AND studioId = $studioId AND releaseId = $releaseId AND environment = $environment AND status NOT IN ['failed', 'stopped', 'superseded'] ORDER BY createdAt DESC LIMIT 1",
    {
      userId: input.userId,
      studioId: tableRecordId("studio", input.studioId),
      releaseId: tableRecordId("release", release._id),
      environment: input.environment,
    },
  );
  if (existingRows[0]) {
    return {
      deployment: normalizeSurrealRow<DeploymentRow>(existingRows[0]),
      release,
      created: false,
    };
  }

  const previous = await activeDeploymentForEnvironment(
    input.userId,
    input.studioId,
    input.environment,
  );
  const key = randomUUID().replaceAll("-", "");
  const now = new Date();
  const created = (await db.create(new StringRecordId(`deployment:${key}`)).content({
    userId: input.userId,
    studioId: tableRecordId("studio", input.studioId),
    environment: input.environment,
    releaseId: tableRecordId("release", release._id),
    ...(previous ? { previousReleaseId: tableRecordId("release", previous.releaseId) } : {}),
    status: "pending",
    createdAt: now,
    updatedAt: now,
  })) as unknown as DeploymentRow;
  const deployment = normalizeSurrealRow<DeploymentRow>(created);
  await appendAuditEvent({
    actorType: "user",
    actorId: input.userId,
    action: "deployment.created",
    targetType: "deployment",
    targetId: deployment._id,
    studioId: input.studioId,
    outcome: "succeeded",
    details: {
      releaseId: release._id,
      previousReleaseId: previous?.releaseId,
      environment: input.environment,
      status: deployment.status,
    },
  });
  return { deployment, release, created: true };
}

export async function transitionDeployment(
  deployment: DeploymentRow,
  status: DeploymentStatus,
  options: {
    failure?: Record<string, unknown>;
    actor?: { type: AuditActorType; id: string };
  } = {},
) {
  assertTransition(DEPLOYMENT_TRANSITIONS, deployment.status, status);
  const db = await getSurreal();
  const updated = await db.update(tableRecordId("deployment", deployment._id)).merge({
    status,
    ...(options.failure ? { failure: options.failure } : {}),
    ...(status === "active" ? { activatedAt: new Date() } : {}),
    updatedAt: new Date(),
  });
  const updatedDeployment = normalizeSurrealRow<DeploymentRow>(updated);
  await appendAuditEvent({
    actorType: options.actor?.type ?? "service",
    actorId: options.actor?.id ?? "nova-runtime-control",
    action: "deployment.transitioned",
    targetType: "deployment",
    targetId: deployment._id,
    studioId: deployment.studioId,
    outcome: status === "failed" ? "failed" : "succeeded",
    details: {
      previousStatus: deployment.status,
      status,
      releaseId: deployment.releaseId,
      failure: options.failure,
    },
  });
  return updatedDeployment;
}

export async function getRuntimeInstance(instanceId: string) {
  const db = await getSurreal();
  const rows = await queryRows<RuntimeInstanceRow>(
    db,
    "SELECT * FROM runtime_instance WHERE id = $instanceId LIMIT 1",
    { instanceId: tableRecordId("runtime_instance", normalizeRouteParam(instanceId)) },
  );
  return rows[0] ? normalizeSurrealRow<RuntimeInstanceRow>(rows[0]) : null;
}

export async function getDeploymentRuntime(deployment: DeploymentRow) {
  if (!deployment.activeRuntimeInstanceId) return null;
  return getRuntimeInstance(deployment.activeRuntimeInstanceId);
}

async function transitionRuntimeInstance(
  runtime: RuntimeInstanceRow,
  status: RuntimeInstanceStatus,
  options: {
    failure?: Record<string, unknown>;
    studioId?: string;
    actor?: { type: AuditActorType; id: string };
  } = {},
) {
  assertTransition(RUNTIME_INSTANCE_TRANSITIONS, runtime.status, status);
  const now = new Date();
  const db = await getSurreal();
  const updated = await db.update(tableRecordId("runtime_instance", runtime._id)).merge({
    status,
    ...(options.failure ? { failure: options.failure } : {}),
    ...(status === "healthy" && !runtime.startedAt ? { startedAt: now } : {}),
    ...(status === "stopped" ? { stoppedAt: now } : {}),
    updatedAt: now,
  });
  const updatedRuntime = normalizeSurrealRow<RuntimeInstanceRow>(updated);
  await appendAuditEvent({
    actorType: options.actor?.type ?? "service",
    actorId: options.actor?.id ?? "nova-runtime-control",
    action: "runtime_instance.transitioned",
    targetType: "runtime_instance",
    targetId: runtime._id,
    studioId: options.studioId,
    outcome: status === "failed" ? "failed" : "succeeded",
    details: {
      deploymentId: runtime.deploymentId,
      nodeId: runtime.nodeId,
      previousStatus: runtime.status,
      status,
      failure: options.failure,
    },
  });
  return updatedRuntime;
}

export async function registerDeploymentRuntime(input: {
  deployment: DeploymentRow;
  nodeId: string;
  provider: string;
  providerInstanceId: string;
  serviceKey: string;
  healthCheck: Record<string, unknown>;
}) {
  let deployment = input.deployment;
  const existing = await getDeploymentRuntime(deployment);
  if (existing && !["stopped", "failed"].includes(existing.status)) {
    return { deployment, runtime: existing, created: false };
  }
  if (["pending", "failed", "stopped"].includes(deployment.status)) {
    deployment = await transitionDeployment(deployment, "provisioning");
  }
  if (deployment.status !== "provisioning") {
    throw new Error(`Deployment cannot provision from ${deployment.status}`);
  }

  const db = await getSurreal();
  const key = randomUUID().replaceAll("-", "");
  const now = new Date();
  const created = (await db.create(new StringRecordId(`runtime_instance:${key}`)).content({
    deploymentId: tableRecordId("deployment", deployment._id),
    nodeId: tableRecordId("infrastructure_node", normalizeRouteParam(input.nodeId)),
    provider: input.provider,
    providerInstanceId: input.providerInstanceId,
    status: "provisioning",
    serviceKey: input.serviceKey,
    healthCheck: input.healthCheck,
    createdAt: now,
    updatedAt: now,
  })) as unknown as RuntimeInstanceRow;
  let runtime = normalizeSurrealRow<RuntimeInstanceRow>(created);
  await appendAuditEvent({
    actorType: "service",
    actorId: "nova-runtime-control",
    action: "runtime_instance.created",
    targetType: "runtime_instance",
    targetId: runtime._id,
    studioId: deployment.studioId,
    outcome: "succeeded",
    details: {
      deploymentId: deployment._id,
      nodeId: input.nodeId,
      provider: input.provider,
      serviceKey: input.serviceKey,
      status: runtime.status,
    },
  });
  runtime = await transitionRuntimeInstance(runtime, "starting", {
    studioId: deployment.studioId,
  });
  const updatedDeployment = await db.update(tableRecordId("deployment", deployment._id)).merge({
    activeRuntimeInstanceId: tableRecordId("runtime_instance", runtime._id),
    updatedAt: new Date(),
  });
  return {
    deployment: normalizeSurrealRow<DeploymentRow>(updatedDeployment),
    runtime,
    created: true,
  };
}

export async function markDeploymentRuntimeHealthy(deployment: DeploymentRow) {
  let runtime = await getDeploymentRuntime(deployment);
  if (!runtime) throw new Error("Deployment has no Runtime Instance");
  if (runtime.status !== "healthy") {
    runtime = await transitionRuntimeInstance(runtime, "healthy", {
      studioId: deployment.studioId,
    });
  }

  let updated = deployment;
  if (updated.status === "provisioning") updated = await transitionDeployment(updated, "verifying");
  if (updated.status === "verifying") updated = await transitionDeployment(updated, "ready");
  return { deployment: updated, runtime };
}

export async function markDeploymentFailed(deployment: DeploymentRow, error: unknown) {
  const failure = {
    code: "deployment_reconcile_failed",
    message: error instanceof Error ? error.message : "Deployment reconciliation failed",
  };
  const runtime = await getDeploymentRuntime(deployment);
  if (runtime && !["stopped", "failed"].includes(runtime.status)) {
    await transitionRuntimeInstance(runtime, "failed", {
      failure,
      studioId: deployment.studioId,
    }).catch(() => {});
  }
  if (deployment.status !== "failed") {
    return transitionDeployment(deployment, "failed", { failure });
  }
  return deployment;
}

export async function activateDeployment(deployment: DeploymentRow) {
  const runtime = await getDeploymentRuntime(deployment);
  const gate = deploymentHealthGate(deployment, runtime);
  if (!gate.allowed) throw new Error(gate.reason ?? "Deployment failed its health gate");
  if (deployment.status === "active") return { deployment, runtime, superseded: null };

  const actor = { type: "user" as const, id: deployment.userId };
  let updated = await transitionDeployment(deployment, "activating", { actor });
  updated = await transitionDeployment(updated, "active", { actor });
  const previous = await activeDeploymentForEnvironment(
    updated.userId,
    updated.studioId,
    updated.environment,
    updated._id,
  );
  const superseded = previous ? await transitionDeployment(previous, "superseded") : null;
  return { deployment: updated, runtime, superseded };
}

export async function stopDeployment(deployment: DeploymentRow) {
  let runtime = await getDeploymentRuntime(deployment);
  if (runtime && !["stopped", "failed"].includes(runtime.status)) {
    const actor = { type: "user" as const, id: deployment.userId };
    if (runtime.status !== "draining") {
      runtime = await transitionRuntimeInstance(runtime, "draining", {
        studioId: deployment.studioId,
        actor,
      });
    }
    runtime = await transitionRuntimeInstance(runtime, "stopped", {
      studioId: deployment.studioId,
      actor,
    });
  }
  const updated =
    deployment.status === "stopped"
      ? deployment
      : await transitionDeployment(deployment, "stopped", {
          actor: { type: "user", id: deployment.userId },
        });
  return { deployment: updated, runtime };
}

export async function prepareRollbackDeployment(input: {
  userId: string;
  deployment: DeploymentRow;
  releaseId?: string;
}) {
  if (input.deployment.status !== "active" && input.deployment.status !== "degraded") {
    throw new Error("Only an active or degraded Deployment can be rolled back");
  }
  const releaseId = selectRollbackRelease(input.deployment, input.releaseId);
  const release = await getReleaseForUser(input.userId, releaseId);
  if (
    !release ||
    release.status !== "ready" ||
    normalizeRouteParam(release.studioId) !== normalizeRouteParam(input.deployment.studioId)
  ) {
    throw new Error("Rollback Release is unavailable");
  }
  return createDeployment({
    userId: input.userId,
    studioId: input.deployment.studioId,
    releaseId: release._id,
    environment: input.deployment.environment,
  });
}

export async function deploymentRelease(
  deployment: Pick<DeploymentRow, "userId" | "releaseId">,
): Promise<ReleaseRow> {
  const release = await getReleaseForUser(deployment.userId, deployment.releaseId);
  if (!release) throw new Error("Deployment Release not found");
  return release;
}
