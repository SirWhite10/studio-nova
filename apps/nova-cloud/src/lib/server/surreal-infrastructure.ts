import { randomUUID } from "node:crypto";

import {
  NODE_ROLES,
  NODE_STATUSES,
  type NodeCapabilities,
  type NodeRole,
  type NodeStatus,
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

export type ConstellationRow = {
  id: unknown;
  _id: string;
  key: string;
  name: string;
  status: "provisioning" | "active" | "degraded" | "offline" | "retired";
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type InfrastructureNodeRow = {
  id: unknown;
  _id: string;
  constellationId: string;
  nodeKey: string;
  role: NodeRole;
  displayName: string;
  hostname: string;
  region?: string | null;
  status: NodeStatus;
  capabilities: NodeCapabilities;
  lastHeartbeatAt?: Date | string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const NODE_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const HEARTBEAT_STALE_AFTER_MS = 2 * 60 * 1000;

function uniqueStrings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].sort();
}

export function normalizeNodeCapabilities(value: unknown): NodeCapabilities {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawCapacity =
    input.capacity && typeof input.capacity === "object"
      ? (input.capacity as Record<string, unknown>)
      : {};
  const capacity = Object.fromEntries(
    Object.entries(rawCapacity)
      .filter(([, amount]) => typeof amount === "number" && Number.isFinite(amount) && amount >= 0)
      .map(([name, amount]): [string, number] => [name.trim(), amount as number])
      .filter(([name]) => name.length > 0),
  );
  return {
    operatingSystems: uniqueStrings(input.operatingSystems),
    architectures: uniqueStrings(input.architectures),
    toolchains: uniqueStrings(input.toolchains),
    runtimes: uniqueStrings(input.runtimes),
    features: uniqueStrings(input.features),
    ...(Object.keys(capacity).length > 0 ? { capacity } : {}),
  };
}

export function normalizeInfrastructureKey(value: string, label = "nodeKey") {
  const key = value.trim().toLowerCase();
  if (!NODE_KEY_PATTERN.test(key)) {
    throw new Error(`${label} must be a lowercase DNS-style key of at most 63 characters`);
  }
  return key;
}

export function assertNodeRole(value: unknown): asserts value is NodeRole {
  if (typeof value !== "string" || !NODE_ROLES.includes(value as NodeRole)) {
    throw new Error(`role must be one of: ${NODE_ROLES.join(", ")}`);
  }
}

function timestamp(value: Date | string | null | undefined) {
  if (!value) return Number.NaN;
  const parsed = new Date(value instanceof Date ? value : String(value));
  return parsed.getTime();
}

export function nodeHeartbeatIsStale(
  lastHeartbeatAt: Date | string | null | undefined,
  now = Date.now(),
  staleAfterMs = HEARTBEAT_STALE_AFTER_MS,
) {
  const heartbeat = timestamp(lastHeartbeatAt);
  return !Number.isFinite(heartbeat) || now - heartbeat > staleAfterMs;
}

export async function getConstellationByKey(constellationKey: string) {
  const key = normalizeInfrastructureKey(constellationKey, "constellationKey");
  const db = await getSurreal();
  const rows = await queryRows<ConstellationRow>(
    db,
    "SELECT * FROM constellation WHERE key = $key LIMIT 1",
    { key },
  );
  return rows[0] ? normalizeSurrealRow<ConstellationRow>(rows[0]) : null;
}

export async function ensureConstellation(input: {
  key: string;
  name?: string;
  metadata?: Record<string, unknown>;
}) {
  const key = normalizeInfrastructureKey(input.key, "constellationKey");
  const existing = await getConstellationByKey(key);
  if (existing) {
    if (existing.status === "retired") throw new Error("Constellation is retired");
    return { constellation: existing, created: false };
  }
  const now = new Date();
  const db = await getSurreal();
  try {
    const recordKey = key.replaceAll("-", "_");
    const created = (await db.create(new StringRecordId(`constellation:${recordKey}`)).content({
      key,
      name: input.name?.trim() || key,
      status: "active",
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    })) as unknown as ConstellationRow;
    return { constellation: normalizeSurrealRow<ConstellationRow>(created), created: true };
  } catch (error) {
    const raced = await getConstellationByKey(key);
    if (raced) return { constellation: raced, created: false };
    throw error;
  }
}

export async function getInfrastructureNode(nodeId: string) {
  const db = await getSurreal();
  const rows = await queryRows<InfrastructureNodeRow>(
    db,
    "SELECT * FROM infrastructure_node WHERE id = $nodeId LIMIT 1",
    { nodeId: tableRecordId("infrastructure_node", normalizeRouteParam(nodeId)) },
  );
  return rows[0] ? normalizeSurrealRow<InfrastructureNodeRow>(rows[0]) : null;
}

export async function listInfrastructureNodes(constellationId?: string) {
  const db = await getSurreal();
  const rows = constellationId
    ? await queryRows<InfrastructureNodeRow>(
        db,
        "SELECT * FROM infrastructure_node WHERE constellationId = $constellationId ORDER BY role, nodeKey",
        { constellationId: tableRecordId("constellation", normalizeRouteParam(constellationId)) },
      )
    : await queryRows<InfrastructureNodeRow>(
        db,
        "SELECT * FROM infrastructure_node ORDER BY role, nodeKey",
      );
  return normalizeSurrealRows<InfrastructureNodeRow>(rows);
}

export async function registerInfrastructureNode(input: {
  constellationKey: string;
  constellationName?: string;
  nodeKey: string;
  role: NodeRole;
  displayName: string;
  hostname: string;
  region?: string;
  capabilities?: unknown;
  metadata?: Record<string, unknown>;
  actorId?: string;
  requestId?: string;
}) {
  assertNodeRole(input.role);
  const nodeKey = normalizeInfrastructureKey(input.nodeKey);
  const displayName = input.displayName.trim();
  const hostname = input.hostname.trim().toLowerCase();
  if (!displayName) throw new Error("displayName is required");
  if (!hostname) throw new Error("hostname is required");
  const { constellation } = await ensureConstellation({
    key: input.constellationKey,
    name: input.constellationName,
  });
  const db = await getSurreal();
  const existingRows = await queryRows<InfrastructureNodeRow>(
    db,
    "SELECT * FROM infrastructure_node WHERE constellationId = $constellationId AND nodeKey = $nodeKey LIMIT 1",
    { constellationId: tableRecordId("constellation", constellation._id), nodeKey },
  );
  const now = new Date();
  const capabilities = normalizeNodeCapabilities(input.capabilities);
  let node: InfrastructureNodeRow;
  let created = false;
  if (existingRows[0]) {
    const existing = normalizeSurrealRow<InfrastructureNodeRow>(existingRows[0]);
    if (existing.role !== input.role) {
      throw new Error(`Node role is immutable (${existing.role} != ${input.role})`);
    }
    if (existing.status === "retired") throw new Error("Node is retired");
    node = normalizeSurrealRow<InfrastructureNodeRow>(
      await db.update(tableRecordId("infrastructure_node", existing._id)).merge({
        displayName,
        hostname,
        ...(input.region?.trim() ? { region: input.region.trim() } : {}),
        status: "online",
        capabilities,
        metadata: input.metadata ?? existing.metadata ?? {},
        lastHeartbeatAt: now,
        updatedAt: now,
      }),
    );
  } else {
    const key = randomUUID().replaceAll("-", "");
    node = normalizeSurrealRow<InfrastructureNodeRow>(
      (await db.create(new StringRecordId(`infrastructure_node:${key}`)).content({
        constellationId: tableRecordId("constellation", constellation._id),
        nodeKey,
        role: input.role,
        displayName,
        hostname,
        ...(input.region?.trim() ? { region: input.region.trim() } : {}),
        status: "online",
        capabilities,
        lastHeartbeatAt: now,
        metadata: input.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      })) as unknown as InfrastructureNodeRow,
    );
    created = true;
  }
  await appendAuditEvent({
    actorType: "service",
    actorId: input.actorId ?? "constellation-control",
    action: created ? "infrastructure.node.registered" : "infrastructure.node.reregistered",
    targetType: "infrastructure_node",
    targetId: node._id,
    outcome: "succeeded",
    requestId: input.requestId,
    details: { constellationId: constellation._id, nodeKey, role: input.role, hostname },
  });
  return { constellation, node, created };
}

export async function heartbeatInfrastructureNode(input: {
  nodeId: string;
  status?: "online" | "degraded" | "draining";
  capabilities?: unknown;
  metadata?: Record<string, unknown>;
  actorId?: string;
  requestId?: string;
}) {
  const node = await getInfrastructureNode(input.nodeId);
  if (!node) throw new Error("Infrastructure node not found");
  if (node.status === "retired") throw new Error("Infrastructure node is retired");
  const status = input.status ?? "online";
  if (!NODE_STATUSES.includes(status)) throw new Error("Invalid node status");
  const now = new Date();
  const db = await getSurreal();
  const updated = normalizeSurrealRow<InfrastructureNodeRow>(
    await db.update(tableRecordId("infrastructure_node", node._id)).merge({
      status,
      ...(input.capabilities !== undefined
        ? { capabilities: normalizeNodeCapabilities(input.capabilities) }
        : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
      lastHeartbeatAt: now,
      updatedAt: now,
    }),
  );
  await appendAuditEvent({
    actorType: "node",
    actorId: input.actorId ?? node.nodeKey,
    action: "infrastructure.node.heartbeat",
    targetType: "infrastructure_node",
    targetId: node._id,
    outcome: "succeeded",
    requestId: input.requestId,
    details: { status },
  });
  return updated;
}

type AffectedResources = {
  workbenchInstances: number;
  buildJobs: number;
  runtimeInstances: number;
  deployments: number;
  tunnelConnectors: number;
  deploymentRoutes: number;
};

async function reconcileNodeResources(node: InfrastructureNodeRow): Promise<AffectedResources> {
  const db = await getSurreal();
  const nodeId = tableRecordId("infrastructure_node", node._id);
  const empty: AffectedResources = {
    workbenchInstances: 0,
    buildJobs: 0,
    runtimeInstances: 0,
    deployments: 0,
    tunnelConnectors: 0,
    deploymentRoutes: 0,
  };
  if (node.role === "forge") {
    const jobs = await queryRows<{ id: unknown }>(
      db,
      "UPDATE build_job SET status = 'failed', failure = { code: 'node_heartbeat_expired', message: 'Assigned Forge node stopped reporting' }, endedAt = time::now(), updatedAt = time::now() WHERE nodeId = $nodeId AND status IN ['assigned', 'preparing', 'building', 'uploading'] RETURN AFTER",
      { nodeId },
    );
    return { ...empty, buildJobs: jobs.length };
  }

  if (node.role === "habitat") {
    const workbenches = await queryRows<{ id: unknown }>(
      db,
      "UPDATE workbench_instance SET status = 'unhealthy', failure = { code: 'node_heartbeat_expired', message: 'Habitat node stopped reporting' }, updatedAt = time::now() WHERE nodeId = $nodeId AND status IN ['starting', 'ready', 'busy'] RETURN AFTER",
      { nodeId },
    );
    const runtimes = await queryRows<{ id: unknown }>(
      db,
      "UPDATE runtime_instance SET status = 'unhealthy', failure = { code: 'node_heartbeat_expired', message: 'Habitat node stopped reporting' }, updatedAt = time::now() WHERE nodeId = $nodeId AND status IN ['starting', 'healthy'] RETURN AFTER",
      { nodeId },
    );
    const runtimeIds = runtimes.map((row) => row.id);
    const deployments = runtimeIds.length
      ? await queryRows<{ id: unknown }>(
          db,
          "UPDATE deployment SET status = 'degraded', failure = { code: 'node_heartbeat_expired', message: 'Active runtime Habitat node stopped reporting' }, updatedAt = time::now() WHERE activeRuntimeInstanceId IN $runtimeIds AND status = 'active' RETURN AFTER",
          { runtimeIds },
        )
      : [];
    const connectors = await queryRows<{ id: unknown }>(
      db,
      "UPDATE tunnel_connector SET status = 'offline', updatedAt = time::now() WHERE habitatNodeId = $nodeId AND status IN ['registering', 'online', 'degraded'] RETURN AFTER",
      { nodeId },
    );
    const connectorIds = connectors.map((row) => row.id);
    const routes = connectorIds.length
      ? await queryRows<{ id: unknown }>(
          db,
          "UPDATE deployment_route SET status = 'degraded', failure = { code: 'tunnel_offline', message: 'Habitat tunnel connector is offline' }, updatedAt = time::now() WHERE tunnelConnectorId IN $connectorIds AND status = 'active' RETURN AFTER",
          { connectorIds },
        )
      : [];
    return {
      ...empty,
      workbenchInstances: workbenches.length,
      runtimeInstances: runtimes.length,
      deployments: deployments.length,
      tunnelConnectors: connectors.length,
      deploymentRoutes: routes.length,
    };
  }

  const connectors = await queryRows<{ id: unknown }>(
    db,
    "UPDATE tunnel_connector SET status = 'offline', updatedAt = time::now() WHERE horizonNodeId = $nodeId AND status IN ['registering', 'online', 'degraded'] RETURN AFTER",
    { nodeId },
  );
  const routes = await queryRows<{ id: unknown }>(
    db,
    "UPDATE deployment_route SET status = 'degraded', failure = { code: 'horizon_offline', message: 'Horizon node stopped reporting' }, updatedAt = time::now() WHERE horizonNodeId = $nodeId AND status = 'active' RETURN AFTER",
    { nodeId },
  );
  return { ...empty, tunnelConnectors: connectors.length, deploymentRoutes: routes.length };
}

export async function reconcileStaleInfrastructure(
  input: {
    staleAfterMs?: number;
    now?: Date;
    actorId?: string;
    requestId?: string;
  } = {},
) {
  const staleAfterMs = Math.max(10_000, input.staleAfterMs ?? HEARTBEAT_STALE_AFTER_MS);
  const now = input.now ?? new Date();
  const cutoff = new Date(now.getTime() - staleAfterMs);
  const db = await getSurreal();
  const rows = await queryRows<InfrastructureNodeRow>(
    db,
    "SELECT * FROM infrastructure_node WHERE status IN ['registering', 'online', 'degraded', 'draining'] AND (lastHeartbeatAt = NONE OR lastHeartbeatAt < $cutoff)",
    { cutoff },
  );
  const results = [];
  for (const row of normalizeSurrealRows<InfrastructureNodeRow>(rows)) {
    const node = normalizeSurrealRow<InfrastructureNodeRow>(
      await db.update(tableRecordId("infrastructure_node", row._id)).merge({
        status: "offline",
        updatedAt: now,
      }),
    );
    const affected = await reconcileNodeResources(node);
    await appendAuditEvent({
      actorType: "system",
      actorId: input.actorId ?? "infrastructure-reconciler",
      action: "infrastructure.node.heartbeat_expired",
      targetType: "infrastructure_node",
      targetId: node._id,
      outcome: "succeeded",
      requestId: input.requestId,
      details: { lastHeartbeatAt: row.lastHeartbeatAt, cutoff: cutoff.toISOString(), affected },
    });
    results.push({ node, affected });
  }
  return { cutoff, staleNodes: results };
}

function statusCounts(rows: Array<{ status: string }>) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    return counts;
  }, {});
}

export async function getConstellationReadiness(staleAfterMs = HEARTBEAT_STALE_AFTER_MS) {
  const db = await getSurreal();
  const [nodes, connectors, runtimes, routes] = await Promise.all([
    listInfrastructureNodes(),
    queryRows<{ status: string }>(db, "SELECT status FROM tunnel_connector"),
    queryRows<{ status: string }>(db, "SELECT status FROM runtime_instance"),
    queryRows<{ status: string }>(db, "SELECT status FROM deployment_route"),
  ]);
  const now = Date.now();
  const roleReadiness = Object.fromEntries(
    NODE_ROLES.map((role) => {
      const roleNodes = nodes.filter((node) => node.role === role && node.status !== "retired");
      const ready = roleNodes.filter(
        (node) =>
          ["online", "degraded"].includes(node.status) &&
          !nodeHeartbeatIsStale(node.lastHeartbeatAt, now, staleAfterMs),
      );
      return [
        role,
        {
          configured: roleNodes.length,
          ready: ready.length,
          stale: roleNodes.filter((node) =>
            nodeHeartbeatIsStale(node.lastHeartbeatAt, now, staleAfterMs),
          ).length,
        },
      ];
    }),
  ) as Record<NodeRole, { configured: number; ready: number; stale: number }>;
  const checks = {
    nodes: {
      ok: NODE_ROLES.every((role) => roleReadiness[role].ready > 0),
      roles: roleReadiness,
    },
    tunnel: {
      ok: connectors.some((row) => row.status === "online"),
      statuses: statusCounts(connectors),
    },
    runtime: {
      ok: !runtimes.some((row) => ["unhealthy", "failed"].includes(row.status)),
      statuses: statusCounts(runtimes),
    },
    route: {
      ok: !routes.some((row) => ["degraded", "failed"].includes(row.status)),
      statuses: statusCounts(routes),
    },
  };
  return { ok: Object.values(checks).every((check) => check.ok), checks };
}
