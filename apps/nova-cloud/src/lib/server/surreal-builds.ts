import { randomUUID } from "node:crypto";

import {
  assertTransition,
  BUILD_JOB_TRANSITIONS,
  evaluateCapabilities,
  explainMissingCapabilities,
  normalizeCapabilityTokens,
  type BuildJobStatus,
} from "@studio-nova/data-contracts";
import { StringRecordId } from "surrealdb";

import { getSurreal } from "./surreal";
import { appendAuditEvent } from "./surreal-audit";
import {
  normalizeRouteParam,
  normalizeSurrealRow,
  normalizeSurrealRows,
  queryRows,
  tableRecordId,
} from "./surreal-records";
import { getWorkbenchForStudio } from "./surreal-workbenches";

export type BuildTargetProfileRow = {
  id: unknown;
  _id: string;
  key: string;
  displayName: string;
  platform: string;
  architecture?: string | null;
  toolchain: string;
  requiredCapabilities: string[];
  artifactKinds: string[];
  enabled: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type BuildJobRow = {
  id: unknown;
  _id: string;
  userId: string;
  studioId: string;
  workbenchId: string;
  targetProfileId: string;
  nodeId?: string | null;
  status: BuildJobStatus;
  sourceRevision: string;
  releaseId?: string | null;
  queuedAt: Date | string;
  startedAt?: Date | string | null;
  endedAt?: Date | string | null;
  failure?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type BuildNodeRow = {
  id: unknown;
  _id: string;
  nodeKey?: string;
  role: string;
  status: string;
  capabilities?: Record<string, unknown> | null;
  lastHeartbeatAt?: Date | string | null;
};

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function capabilityTokens(capabilities: Record<string, unknown> | null | undefined) {
  if (!capabilities) return [];
  const tokens = new Set<string>();
  const mappings = [
    ["operatingSystems", "os"],
    ["architectures", "arch"],
    ["toolchains", "toolchain"],
    ["runtimes", "runtime"],
  ] as const;
  for (const [key, prefix] of mappings) {
    for (const value of stringList(capabilities[key])) {
      tokens.add(`${prefix}:${value.toLowerCase()}`);
    }
  }
  for (const value of stringList(capabilities.features)) tokens.add(value.toLowerCase());
  return normalizeCapabilityTokens([...tokens]);
}

export function targetCompatibility(
  target: Pick<BuildTargetProfileRow, "requiredCapabilities">,
  node: Pick<BuildNodeRow, "role" | "status" | "capabilities">,
) {
  const available = capabilityTokens(node.capabilities);
  const evaluation = evaluateCapabilities(target.requiredCapabilities, available);
  return {
    compatible:
      node.role === "forge" &&
      ["online", "degraded"].includes(node.status) &&
      evaluation.compatible,
    available: evaluation.available,
    missing: evaluation.missing,
  };
}

function nodeLabel(node: BuildNodeRow) {
  return node.nodeKey?.trim() || node._id;
}

function nodeStatusRank(status: string) {
  if (status === "online") return 0;
  if (status === "degraded") return 1;
  return 2;
}

export function buildQueueDecision(
  target: Pick<BuildTargetProfileRow, "requiredCapabilities">,
  nodes: BuildNodeRow[],
) {
  const evaluations = nodes
    .map((node) => ({ node, ...targetCompatibility(target, node) }))
    .sort((left, right) => {
      if (left.compatible !== right.compatible) return left.compatible ? -1 : 1;
      const missingDifference = left.missing.length - right.missing.length;
      if (missingDifference !== 0) return missingDifference;
      const statusDifference = nodeStatusRank(left.node.status) - nodeStatusRank(right.node.status);
      if (statusDifference !== 0) return statusDifference;
      return nodeLabel(left.node).localeCompare(nodeLabel(right.node));
    });
  const match = evaluations.find(({ compatible }) => compatible) ?? null;
  const closest = evaluations[0] ?? null;
  let queueReason: string | null = null;
  if (!match && !closest) {
    queueReason = `No Forge nodes are registered. ${explainMissingCapabilities(
      target.requiredCapabilities,
    )}`;
  } else if (!match && closest && closest.missing.length === 0) {
    queueReason = `Compatible Forge node ${nodeLabel(closest.node)} is ${closest.node.status}`;
  } else if (!match && closest) {
    queueReason = `${explainMissingCapabilities(closest.missing)} on Forge node ${nodeLabel(
      closest.node,
    )}`;
  }
  return {
    policy: match ? ("assigned" as const) : ("queued" as const),
    node: match?.node ?? null,
    missingCapabilities: match
      ? []
      : (closest?.missing ?? normalizeCapabilityTokens(target.requiredCapabilities)),
    queueReason,
    evaluations,
  };
}

export async function listBuildTargetProfiles() {
  const db = await getSurreal();
  const rows = await queryRows<BuildTargetProfileRow>(
    db,
    "SELECT * FROM build_target_profile WHERE enabled = true ORDER BY displayName ASC",
  );
  return normalizeSurrealRows<BuildTargetProfileRow>(rows);
}

export async function getBuildTargetProfile(targetProfileIdOrKey: string) {
  const db = await getSurreal();
  const value = normalizeRouteParam(targetProfileIdOrKey);
  const rows = await queryRows<BuildTargetProfileRow>(
    db,
    "SELECT * FROM build_target_profile WHERE id = type::record('build_target_profile', $value) OR key = $value LIMIT 1",
    { value },
  );
  return rows[0] ? normalizeSurrealRow<BuildTargetProfileRow>(rows[0]) : null;
}

async function listForgeNodes() {
  const db = await getSurreal();
  const rows = await queryRows<BuildNodeRow>(
    db,
    "SELECT * FROM infrastructure_node WHERE role = 'forge' AND status != 'retired' ORDER BY nodeKey ASC",
  );
  return normalizeSurrealRows<BuildNodeRow>(rows);
}

export async function findCompatibleBuildNode(target: BuildTargetProfileRow) {
  const nodes = await listForgeNodes();
  return buildQueueDecision(target, nodes);
}

export async function listBuildJobsForWorkbench(
  userId: string,
  studioId: string,
  workbenchId: string,
) {
  const workbench = await getWorkbenchForStudio(userId, studioId, workbenchId);
  if (!workbench) return null;
  const db = await getSurreal();
  const rows = await queryRows<BuildJobRow>(
    db,
    "SELECT * FROM build_job WHERE userId = $userId AND studioId = $studioId AND workbenchId = $workbenchId ORDER BY queuedAt DESC",
    {
      userId,
      studioId: tableRecordId("studio", studioId),
      workbenchId: tableRecordId("workbench", workbenchId),
    },
  );
  return normalizeSurrealRows<BuildJobRow>(rows);
}

export async function getBuildJobForUser(userId: string, buildJobId: string) {
  const db = await getSurreal();
  const rows = await queryRows<BuildJobRow>(
    db,
    "SELECT * FROM build_job WHERE id = $buildJobId LIMIT 1",
    { buildJobId: tableRecordId("build_job", normalizeRouteParam(buildJobId)) },
  );
  if (!rows[0] || rows[0].userId !== userId) return null;
  return normalizeSurrealRow<BuildJobRow>(rows[0]);
}

export async function createBuildJob(input: {
  userId: string;
  studioId: string;
  workbenchId: string;
  targetProfileId: string;
  sourceRevision: string;
  metadata?: Record<string, unknown>;
}) {
  const workbench = await getWorkbenchForStudio(input.userId, input.studioId, input.workbenchId);
  if (!workbench) throw new Error("Workbench not found");
  const target = await getBuildTargetProfile(input.targetProfileId);
  if (!target?.enabled) throw new Error("Build target is unavailable");
  const sourceRevision = input.sourceRevision.trim();
  if (!sourceRevision) throw new Error("sourceRevision is required");

  const assignment = await findCompatibleBuildNode(target);
  const status: BuildJobStatus = assignment.node ? "assigned" : "queued";
  const now = new Date();
  const key = randomUUID().replaceAll("-", "");
  const db = await getSurreal();
  const created = (await db.create(new StringRecordId(`build_job:${key}`)).content({
    userId: input.userId,
    studioId: tableRecordId("studio", input.studioId),
    workbenchId: tableRecordId("workbench", input.workbenchId),
    targetProfileId: tableRecordId("build_target_profile", target._id),
    ...(assignment.node
      ? { nodeId: tableRecordId("infrastructure_node", assignment.node._id) }
      : {}),
    status,
    sourceRevision,
    queuedAt: now,
    metadata: {
      ...input.metadata,
      requiredCapabilities: target.requiredCapabilities,
      missingCapabilities: assignment.missingCapabilities,
      queuePolicy: assignment.policy,
      queueReason: assignment.queueReason,
    },
    createdAt: now,
    updatedAt: now,
  })) as unknown as BuildJobRow;
  const job = normalizeSurrealRow<BuildJobRow>(created);
  await appendAuditEvent({
    actorType: "user",
    actorId: input.userId,
    action: "build_job.created",
    targetType: "build_job",
    targetId: job._id,
    studioId: input.studioId,
    outcome: "succeeded",
    details: {
      workbenchId: input.workbenchId,
      targetProfileId: target._id,
      nodeId: assignment.node?._id,
      status,
      missingCapabilities: assignment.missingCapabilities,
      queueReason: assignment.queueReason,
    },
  });
  return {
    job,
    target,
    node: assignment.node,
    missingCapabilities: assignment.missingCapabilities,
    queueReason: assignment.queueReason,
  };
}

export async function transitionBuildJob(
  job: BuildJobRow,
  status: BuildJobStatus,
  options: {
    nodeId?: string;
    releaseId?: string;
    failure?: Record<string, unknown>;
  } = {},
) {
  assertTransition(BUILD_JOB_TRANSITIONS, job.status, status);
  const now = new Date();
  const terminal = ["succeeded", "failed", "canceled"].includes(status);
  const db = await getSurreal();
  const updated = await db.update(tableRecordId("build_job", job._id)).merge({
    status,
    ...(options.nodeId ? { nodeId: tableRecordId("infrastructure_node", options.nodeId) } : {}),
    ...(options.releaseId ? { releaseId: tableRecordId("release", options.releaseId) } : {}),
    ...(options.failure ? { failure: options.failure } : {}),
    ...(!job.startedAt && ["preparing", "building", "uploading"].includes(status)
      ? { startedAt: now }
      : {}),
    ...(terminal ? { endedAt: now } : {}),
    updatedAt: now,
  });
  const updatedJob = normalizeSurrealRow<BuildJobRow>(updated);
  await appendAuditEvent({
    actorType: "service",
    actorId: "nova-build-control",
    action: "build_job.transitioned",
    targetType: "build_job",
    targetId: job._id,
    studioId: job.studioId,
    outcome: status === "failed" ? "failed" : "succeeded",
    details: {
      previousStatus: job.status,
      status,
      nodeId: options.nodeId ?? updatedJob.nodeId,
      releaseId: options.releaseId ?? updatedJob.releaseId,
      failure: options.failure,
    },
  });
  return updatedJob;
}
