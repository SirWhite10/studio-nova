import { randomUUID } from "node:crypto";

import {
  assertTransition,
  WORKBENCH_INSTANCE_TRANSITIONS,
  WORKBENCH_TRANSITIONS,
  type WorkbenchInstanceStatus,
  type WorkbenchStatus,
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
import { getStudioForUser } from "./surreal-studios";

export type WorkbenchRow = {
  id: unknown;
  _id: string;
  userId: string;
  studioId: string;
  name: string;
  slug: string;
  status: WorkbenchStatus;
  sourceVolumeKey: string;
  activeInstanceId?: string | null;
  defaultTargetProfileId?: string | null;
  legacyWorkspaceId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type WorkbenchInstanceRow = {
  id: unknown;
  _id: string;
  workbenchId: string;
  nodeId: string;
  provider: string;
  providerInstanceId: string;
  status: WorkbenchInstanceStatus;
  sourceMountPath: string;
  previewEndpoint?: string | null;
  expiresAt?: Date | string | null;
  lastHeartbeatAt?: Date | string | null;
  failure?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type HabitatNodeRow = { id: unknown; _id: string; status: string };

export function workbenchSlug(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "workbench";
}

export function workbenchBelongsTo(
  workbench: Pick<WorkbenchRow, "userId" | "studioId">,
  userId: string,
  studioId: string,
) {
  return (
    workbench.userId === userId &&
    normalizeRouteParam(workbench.studioId) === normalizeRouteParam(studioId)
  );
}

export async function listWorkbenchesForStudio(userId: string, studioId: string) {
  const db = await getSurreal();
  const rows = await queryRows<WorkbenchRow>(
    db,
    "SELECT * FROM workbench WHERE userId = $userId AND studioId = $studioId ORDER BY updatedAt DESC",
    { userId, studioId: tableRecordId("studio", normalizeRouteParam(studioId)) },
  );
  return normalizeSurrealRows<WorkbenchRow>(rows);
}

export async function getWorkbenchForStudio(userId: string, studioId: string, workbenchId: string) {
  const db = await getSurreal();
  const rows = await queryRows<WorkbenchRow>(
    db,
    "SELECT * FROM workbench WHERE id = $workbenchId LIMIT 1",
    { workbenchId: tableRecordId("workbench", normalizeRouteParam(workbenchId)) },
  );
  if (!rows[0]) return null;
  const normalized = normalizeSurrealRow<WorkbenchRow>(rows[0]);
  if (!workbenchBelongsTo(normalized, userId, studioId)) return null;
  return normalized;
}

async function findWorkbenchBySlug(userId: string, studioId: string, slug: string) {
  const db = await getSurreal();
  const rows = await queryRows<WorkbenchRow>(
    db,
    "SELECT * FROM workbench WHERE userId = $userId AND studioId = $studioId AND slug = $slug LIMIT 1",
    { userId, studioId: tableRecordId("studio", normalizeRouteParam(studioId)), slug },
  );
  return rows[0] ? normalizeSurrealRow<WorkbenchRow>(rows[0]) : null;
}

export async function createWorkbenchForStudio(input: {
  userId: string;
  studioId: string;
  name: string;
  slug?: string;
  legacyWorkspaceId?: string;
  sourceVolumeKey?: string;
  metadata?: Record<string, unknown>;
}) {
  const studio = await getStudioForUser(input.userId, input.studioId);
  if (!studio) throw new Error("Studio not found");

  const slug = workbenchSlug(input.slug ?? input.name);
  const existing = await findWorkbenchBySlug(input.userId, input.studioId, slug);
  if (existing) return { workbench: existing, created: false };

  const db = await getSurreal();
  const key = randomUUID().replaceAll("-", "");
  const id = new StringRecordId(`workbench:${key}`);
  const now = new Date();
  const created = (await db.create(id).content({
    userId: input.userId,
    studioId: tableRecordId("studio", normalizeRouteParam(input.studioId)),
    name: input.name.trim() || "Workbench",
    slug,
    status: "creating",
    sourceVolumeKey: input.sourceVolumeKey ?? `source-${key}`,
    ...(input.legacyWorkspaceId
      ? {
          legacyWorkspaceId: tableRecordId(
            "workspace",
            normalizeRouteParam(input.legacyWorkspaceId),
          ),
        }
      : {}),
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  })) as unknown as WorkbenchRow;
  const createdRow = normalizeSurrealRow<WorkbenchRow>(created);
  assertTransition(WORKBENCH_TRANSITIONS, createdRow.status, "ready");
  const updated = await db.update(id).merge({ status: "ready", updatedAt: new Date() });
  const workbench = normalizeSurrealRow<WorkbenchRow>(updated);
  await appendAuditEvent({
    actorType: "user",
    actorId: input.userId,
    action: "workbench.created",
    targetType: "workbench",
    targetId: workbench._id,
    studioId: input.studioId,
    outcome: "succeeded",
    details: {
      status: workbench.status,
      slug: workbench.slug,
      sourceVolumeKey: workbench.sourceVolumeKey,
      compatibility: Boolean(input.legacyWorkspaceId),
    },
  });
  return { workbench, created: true };
}

export async function ensureWorkbenchForLegacyWorkspace(input: {
  userId: string;
  studioId: string;
  workspaceId: string;
  name: string;
  slug: string;
  statePath: string;
}) {
  const db = await getSurreal();
  const legacyWorkspaceId = tableRecordId("workspace", normalizeRouteParam(input.workspaceId));
  const rows = await queryRows<WorkbenchRow>(
    db,
    "SELECT * FROM workbench WHERE legacyWorkspaceId = $legacyWorkspaceId LIMIT 1",
    { legacyWorkspaceId },
  );
  if (rows[0]) return normalizeSurrealRow<WorkbenchRow>(rows[0]);

  const result = await createWorkbenchForStudio({
    userId: input.userId,
    studioId: input.studioId,
    name: input.name,
    slug: input.slug,
    legacyWorkspaceId: input.workspaceId,
    sourceVolumeKey: input.statePath || `legacy-${normalizeRouteParam(input.workspaceId)}`,
    metadata: { compatibility: true },
  });
  return result.workbench;
}

export async function findHabitatNode() {
  const db = await getSurreal();
  const rows = await queryRows<HabitatNodeRow>(
    db,
    "SELECT * FROM infrastructure_node WHERE role = 'habitat' AND status IN ['online', 'degraded'] ORDER BY lastHeartbeatAt DESC LIMIT 1",
  );
  if (rows[0]) return normalizeSurrealRow<HabitatNodeRow>(rows[0]);

  try {
    const legacy = await db.select<HabitatNodeRow>(
      new StringRecordId("infrastructure_node:legacy_habitat"),
    );
    const row = Array.isArray(legacy) ? legacy[0] : legacy;
    return row ? normalizeSurrealRow<HabitatNodeRow>(row) : null;
  } catch {
    return null;
  }
}

export async function getWorkbenchInstance(instanceId: string) {
  const db = await getSurreal();
  const rows = await queryRows<WorkbenchInstanceRow>(
    db,
    "SELECT * FROM workbench_instance WHERE id = $instanceId LIMIT 1",
    { instanceId: tableRecordId("workbench_instance", normalizeRouteParam(instanceId)) },
  );
  return rows[0] ? normalizeSurrealRow<WorkbenchInstanceRow>(rows[0]) : null;
}

async function transitionWorkbenchInstance(
  instance: WorkbenchInstanceRow,
  status: WorkbenchInstanceStatus,
) {
  assertTransition(WORKBENCH_INSTANCE_TRANSITIONS, instance.status, status);
  const db = await getSurreal();
  const updated = await db
    .update(tableRecordId("workbench_instance", instance._id))
    .merge({ status, updatedAt: new Date() });
  return normalizeSurrealRow<WorkbenchInstanceRow>(updated);
}

export async function activateWorkbenchInstance(input: {
  workbench: WorkbenchRow;
  nodeId: string;
  provider: string;
  providerInstanceId: string;
  previewEndpoint?: string;
}) {
  const db = await getSurreal();
  const active = input.workbench.activeInstanceId
    ? await getWorkbenchInstance(input.workbench.activeInstanceId)
    : null;
  if (active && !["stopped", "expired", "failed"].includes(active.status)) {
    return { workbench: input.workbench, instance: active, created: false };
  }

  const key = randomUUID().replaceAll("-", "");
  const id = new StringRecordId(`workbench_instance:${key}`);
  const now = new Date();
  const created = (await db.create(id).content({
    workbenchId: tableRecordId("workbench", input.workbench._id),
    nodeId: tableRecordId("infrastructure_node", normalizeRouteParam(input.nodeId)),
    provider: input.provider,
    providerInstanceId: input.providerInstanceId,
    status: "allocating",
    sourceMountPath: "/workspace",
    ...(input.previewEndpoint ? { previewEndpoint: input.previewEndpoint } : {}),
    createdAt: now,
    updatedAt: now,
  })) as unknown as WorkbenchInstanceRow;
  let instance = normalizeSurrealRow<WorkbenchInstanceRow>(created);
  instance = await transitionWorkbenchInstance(instance, "starting");
  instance = await transitionWorkbenchInstance(instance, "ready");

  assertTransition(WORKBENCH_TRANSITIONS, input.workbench.status, "ready");
  const updatedWorkbench = await db.update(tableRecordId("workbench", input.workbench._id)).merge({
    activeInstanceId: tableRecordId("workbench_instance", instance._id),
    status: "ready",
    updatedAt: new Date(),
  });
  await appendAuditEvent({
    actorType: "service",
    actorId: "nova-runtime-control",
    action: "workbench_instance.activated",
    targetType: "workbench_instance",
    targetId: instance._id,
    studioId: input.workbench.studioId,
    outcome: "succeeded",
    details: {
      workbenchId: input.workbench._id,
      nodeId: input.nodeId,
      provider: input.provider,
      status: instance.status,
    },
  });
  return {
    workbench: normalizeSurrealRow<WorkbenchRow>(updatedWorkbench),
    instance,
    created: true,
  };
}

export async function stopWorkbenchInstance(workbench: WorkbenchRow) {
  const db = await getSurreal();
  let instance = workbench.activeInstanceId
    ? await getWorkbenchInstance(workbench.activeInstanceId)
    : null;
  if (instance && !["stopped", "expired", "failed"].includes(instance.status)) {
    instance = await transitionWorkbenchInstance(instance, "stopping");
    instance = await transitionWorkbenchInstance(instance, "stopped");
  }

  if (workbench.status !== "paused") {
    assertTransition(WORKBENCH_TRANSITIONS, workbench.status, "paused");
  }
  const [rows] = await db.query<[WorkbenchRow[]]>(
    "UPDATE type::record('workbench', $workbenchId) SET activeInstanceId = NONE, status = 'paused', updatedAt = time::now() RETURN AFTER",
    { workbenchId: normalizeRouteParam(workbench._id) },
  );
  await appendAuditEvent({
    actorType: "user",
    actorId: workbench.userId,
    action: "workbench.stopped",
    targetType: "workbench",
    targetId: workbench._id,
    studioId: workbench.studioId,
    outcome: "succeeded",
    details: {
      instanceId: instance?._id,
      previousStatus: workbench.status,
      status: "paused",
    },
  });
  return {
    workbench: normalizeSurrealRow<WorkbenchRow>(rows[0]),
    instance,
  };
}
