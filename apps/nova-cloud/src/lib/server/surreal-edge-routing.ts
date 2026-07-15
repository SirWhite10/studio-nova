import { randomBytes, randomUUID } from "node:crypto";

import { assertTransition, ROUTE_TRANSITIONS, type RouteStatus } from "@studio-nova/data-contracts";
import { StringRecordId } from "surrealdb";

import { getSurreal } from "./surreal";
import { appendAuditEvent } from "./surreal-audit";
import {
  getDeploymentForUser,
  getDeploymentRuntime,
  type DeploymentRow,
  type RuntimeInstanceRow,
} from "./surreal-deployments";
import {
  normalizeRouteParam,
  normalizeSurrealRow,
  normalizeSurrealRows,
  queryRows,
  tableRecordId,
} from "./surreal-records";
import { getStudioForUser } from "./surreal-studios";

export type DomainBindingRow = {
  id: unknown;
  _id: string;
  userId: string;
  studioId: string;
  host: string;
  kind: "platform" | "custom";
  ownershipStatus: "pending" | "verified" | "failed" | "revoked";
  certificateStatus: "pending" | "issuing" | "active" | "renewal_due" | "failed" | "revoked";
  verificationToken?: string | null;
  legacyProxyDomainId?: string | null;
  verifiedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type TunnelConnectorRow = {
  id: unknown;
  _id: string;
  constellationId: string;
  habitatNodeId: string;
  horizonNodeId: string;
  connectorKey: string;
  protocol: "nova-yamux-v1" | "frp";
  status: "registering" | "online" | "degraded" | "offline" | "revoked";
  legacyFrpClientId?: string | null;
  connectedAt?: Date | string | null;
  lastSeenAt?: Date | string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type DeploymentRouteRow = {
  id: unknown;
  _id: string;
  domainBindingId: string;
  deploymentId: string;
  horizonNodeId: string;
  tunnelConnectorId: string;
  status: RouteStatus;
  legacyWorkspaceProxyId?: string | null;
  activatedAt?: Date | string | null;
  failure?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type InfrastructureRouteNode = {
  id: unknown;
  _id: string;
  constellationId: string;
  role: "forge" | "horizon" | "habitat";
  status: string;
};

export function normalizeDomainHost(host: string) {
  const normalized = host.trim().toLowerCase().replace(/\.$/, "");
  if (
    normalized.length > 253 ||
    !normalized.includes(".") ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
      normalized,
    )
  ) {
    throw new Error("Invalid domain host");
  }
  return normalized;
}

export function routeTenantMatches(
  domain: Pick<DomainBindingRow, "userId" | "studioId">,
  deployment: Pick<DeploymentRow, "userId" | "studioId">,
) {
  return (
    domain.userId === deployment.userId &&
    normalizeRouteParam(domain.studioId) === normalizeRouteParam(deployment.studioId)
  );
}

export function routeActivationReadiness(input: {
  domain: Pick<DomainBindingRow, "ownershipStatus" | "certificateStatus">;
  deployment: Pick<DeploymentRow, "_id" | "status">;
  runtime: Pick<RuntimeInstanceRow, "deploymentId" | "nodeId" | "status"> | null;
  connector: Pick<TunnelConnectorRow, "habitatNodeId" | "horizonNodeId" | "status"> | null;
  horizon: Pick<InfrastructureRouteNode, "_id" | "role" | "status"> | null;
}) {
  if (input.domain.ownershipStatus !== "verified") return "Domain ownership is not verified";
  if (input.domain.certificateStatus !== "active") return "Domain certificate is not active";
  if (input.deployment.status !== "active") return "Deployment is not active";
  if (!input.runtime || input.runtime.status !== "healthy")
    return "Runtime Instance is not healthy";
  if (
    normalizeRouteParam(input.runtime.deploymentId) !== normalizeRouteParam(input.deployment._id)
  ) {
    return "Runtime Instance belongs to a different Deployment";
  }
  if (!input.connector || input.connector.status !== "online")
    return "Tunnel Connector is not online";
  if (
    normalizeRouteParam(input.connector.habitatNodeId) !== normalizeRouteParam(input.runtime.nodeId)
  ) {
    return "Tunnel Connector belongs to a different Habitat node";
  }
  if (
    !input.horizon ||
    input.horizon.role !== "horizon" ||
    !["online", "degraded"].includes(input.horizon.status)
  ) {
    return "Horizon node is unavailable";
  }
  if (
    normalizeRouteParam(input.connector.horizonNodeId) !== normalizeRouteParam(input.horizon._id)
  ) {
    return "Tunnel Connector belongs to a different Horizon node";
  }
  return null;
}

export async function listDomainBindingsForStudio(userId: string, studioId: string) {
  const db = await getSurreal();
  const rows = await queryRows<DomainBindingRow>(
    db,
    "SELECT * FROM domain_binding WHERE userId = $userId AND studioId = $studioId AND ownershipStatus != 'revoked' ORDER BY updatedAt DESC",
    { userId, studioId: tableRecordId("studio", normalizeRouteParam(studioId)) },
  );
  return normalizeSurrealRows<DomainBindingRow>(rows);
}

export async function getDomainBindingForStudio(userId: string, studioId: string, host: string) {
  const db = await getSurreal();
  const rows = await queryRows<DomainBindingRow>(
    db,
    "SELECT * FROM domain_binding WHERE host = $host LIMIT 1",
    { host: normalizeDomainHost(host) },
  );
  if (!rows[0]) return null;
  const binding = normalizeSurrealRow<DomainBindingRow>(rows[0]);
  return binding.userId === userId &&
    normalizeRouteParam(binding.studioId) === normalizeRouteParam(studioId)
    ? binding
    : null;
}

export async function createDomainBinding(input: {
  userId: string;
  studioId: string;
  host: string;
  kind?: "platform" | "custom";
  legacyProxyDomainId?: string;
}) {
  const studio = await getStudioForUser(input.userId, input.studioId);
  if (!studio) throw new Error("Studio not found");
  const host = normalizeDomainHost(input.host);
  const db = await getSurreal();
  const existingRows = await queryRows<DomainBindingRow>(
    db,
    "SELECT * FROM domain_binding WHERE host = $host LIMIT 1",
    { host },
  );
  if (existingRows[0]) {
    const existing = normalizeSurrealRow<DomainBindingRow>(existingRows[0]);
    if (
      existing.userId !== input.userId ||
      normalizeRouteParam(existing.studioId) !== normalizeRouteParam(input.studioId)
    ) {
      throw new Error("Domain host is already assigned to another Studio");
    }
    return { binding: existing, created: false };
  }

  const kind = input.kind ?? "custom";
  const now = new Date();
  const key = randomUUID().replaceAll("-", "");
  const created = (await db.create(new StringRecordId(`domain_binding:${key}`)).content({
    userId: input.userId,
    studioId: tableRecordId("studio", normalizeRouteParam(input.studioId)),
    host,
    kind,
    ownershipStatus: kind === "platform" ? "verified" : "pending",
    certificateStatus: "pending",
    ...(kind === "custom" ? { verificationToken: randomBytes(24).toString("hex") } : {}),
    ...(input.legacyProxyDomainId
      ? {
          legacyProxyDomainId: tableRecordId(
            "proxy_domain",
            normalizeRouteParam(input.legacyProxyDomainId),
          ),
        }
      : {}),
    ...(kind === "platform" ? { verifiedAt: now } : {}),
    createdAt: now,
    updatedAt: now,
  })) as unknown as DomainBindingRow;
  const binding = normalizeSurrealRow<DomainBindingRow>(created);
  await appendAuditEvent({
    actorType: "user",
    actorId: input.userId,
    action: "domain_binding.created",
    targetType: "domain_binding",
    targetId: binding._id,
    studioId: input.studioId,
    outcome: "succeeded",
    details: {
      host,
      kind,
      ownershipStatus: binding.ownershipStatus,
      certificateStatus: binding.certificateStatus,
    },
  });
  return { binding, created: true };
}

export async function markDomainBindingVerified(input: {
  userId: string;
  studioId: string;
  host: string;
}) {
  const binding = await getDomainBindingForStudio(input.userId, input.studioId, input.host);
  if (!binding) throw new Error("Domain Binding not found");
  const db = await getSurreal();
  const updated = await db.update(tableRecordId("domain_binding", binding._id)).merge({
    ownershipStatus: "verified",
    certificateStatus: binding.certificateStatus === "active" ? "active" : "issuing",
    verifiedAt: new Date(),
    updatedAt: new Date(),
  });
  const verified = normalizeSurrealRow<DomainBindingRow>(updated);
  await appendAuditEvent({
    actorType: "user",
    actorId: input.userId,
    action: "domain_binding.verified",
    targetType: "domain_binding",
    targetId: binding._id,
    studioId: input.studioId,
    outcome: "succeeded",
    details: {
      host: binding.host,
      ownershipStatus: verified.ownershipStatus,
      certificateStatus: verified.certificateStatus,
    },
  });
  return verified;
}

export async function markDomainCertificateActive(binding: DomainBindingRow) {
  if (binding.ownershipStatus !== "verified") {
    throw new Error("Cannot activate a certificate before domain ownership verification");
  }
  const db = await getSurreal();
  const updated = await db.update(tableRecordId("domain_binding", binding._id)).merge({
    certificateStatus: "active",
    updatedAt: new Date(),
  });
  const active = normalizeSurrealRow<DomainBindingRow>(updated);
  await appendAuditEvent({
    actorType: "service",
    actorId: "nova-edge",
    action: "domain_binding.certificate_activated",
    targetType: "domain_binding",
    targetId: binding._id,
    studioId: binding.studioId,
    outcome: "succeeded",
    details: { host: binding.host, certificateStatus: active.certificateStatus },
  });
  return active;
}

export async function revokeDomainBinding(input: {
  userId: string;
  studioId: string;
  host: string;
}) {
  const binding = await getDomainBindingForStudio(input.userId, input.studioId, input.host);
  if (!binding) return false;
  const db = await getSurreal();
  await db.update(tableRecordId("domain_binding", binding._id)).merge({
    ownershipStatus: "revoked",
    certificateStatus: "revoked",
    updatedAt: new Date(),
  });
  await db.query(
    "UPDATE deployment_route SET status = 'disabled', updatedAt = time::now() WHERE domainBindingId = $domainBindingId",
    { domainBindingId: tableRecordId("domain_binding", binding._id) },
  );
  await appendAuditEvent({
    actorType: "user",
    actorId: input.userId,
    action: "domain_binding.revoked",
    targetType: "domain_binding",
    targetId: binding._id,
    studioId: input.studioId,
    outcome: "succeeded",
    details: { host: binding.host },
  });
  return true;
}

async function routeForDomain(domainBindingId: string) {
  const db = await getSurreal();
  const rows = await queryRows<DeploymentRouteRow>(
    db,
    "SELECT * FROM deployment_route WHERE domainBindingId = $domainBindingId LIMIT 1",
    { domainBindingId: tableRecordId("domain_binding", normalizeRouteParam(domainBindingId)) },
  );
  return rows[0] ? normalizeSurrealRow<DeploymentRouteRow>(rows[0]) : null;
}

async function getInfrastructureNode(nodeId: string) {
  const db = await getSurreal();
  const rows = await queryRows<InfrastructureRouteNode>(
    db,
    "SELECT * FROM infrastructure_node WHERE id = $nodeId LIMIT 1",
    { nodeId: tableRecordId("infrastructure_node", normalizeRouteParam(nodeId)) },
  );
  return rows[0] ? normalizeSurrealRow<InfrastructureRouteNode>(rows[0]) : null;
}

async function connectorForRuntime(runtime: RuntimeInstanceRow) {
  const db = await getSurreal();
  const rows = await queryRows<TunnelConnectorRow>(
    db,
    "SELECT * FROM tunnel_connector WHERE habitatNodeId = $habitatNodeId AND status = 'online' ORDER BY lastSeenAt DESC LIMIT 1",
    { habitatNodeId: tableRecordId("infrastructure_node", runtime.nodeId) },
  );
  return rows[0] ? normalizeSurrealRow<TunnelConnectorRow>(rows[0]) : null;
}

export async function planDeploymentRoute(input: {
  userId: string;
  studioId: string;
  host: string;
  deploymentId: string;
}) {
  const domain = await getDomainBindingForStudio(input.userId, input.studioId, input.host);
  if (!domain) throw new Error("Domain Binding not found");
  const deployment = await getDeploymentForUser(input.userId, input.deploymentId);
  if (!deployment || !routeTenantMatches(domain, deployment)) {
    throw new Error("Deployment does not belong to this Domain Binding");
  }
  const runtime = await getDeploymentRuntime(deployment);
  const connector = runtime ? await connectorForRuntime(runtime) : null;
  const horizon = connector ? await getInfrastructureNode(connector.horizonNodeId) : null;
  const reason = routeActivationReadiness({ domain, deployment, runtime, connector, horizon });
  if (reason) throw new Error(reason);
  return {
    domain,
    deployment,
    runtime: runtime!,
    connector: connector!,
    horizon: horizon!,
    existing: await routeForDomain(domain._id),
  };
}

export async function activatePlannedDeploymentRoute(
  plan: Awaited<ReturnType<typeof planDeploymentRoute>>,
) {
  const db = await getSurreal();
  const now = new Date();
  if (plan.existing) {
    const updated = await db.update(tableRecordId("deployment_route", plan.existing._id)).merge({
      deploymentId: tableRecordId("deployment", plan.deployment._id),
      horizonNodeId: tableRecordId("infrastructure_node", plan.horizon._id),
      tunnelConnectorId: tableRecordId("tunnel_connector", plan.connector._id),
      status: "active",
      activatedAt: now,
      updatedAt: now,
    });
    const route = normalizeSurrealRow<DeploymentRouteRow>(updated);
    await appendAuditEvent({
      actorType: "user",
      actorId: plan.domain.userId,
      action: "deployment_route.activated",
      targetType: "deployment_route",
      targetId: route._id,
      studioId: plan.domain.studioId,
      outcome: "succeeded",
      details: {
        domainBindingId: plan.domain._id,
        deploymentId: plan.deployment._id,
        previousDeploymentId: plan.existing.deploymentId,
        horizonNodeId: plan.horizon._id,
        tunnelConnectorId: plan.connector._id,
        status: route.status,
      },
    });
    return route;
  }

  const key = randomUUID().replaceAll("-", "");
  const created = (await db.create(new StringRecordId(`deployment_route:${key}`)).content({
    domainBindingId: tableRecordId("domain_binding", plan.domain._id),
    deploymentId: tableRecordId("deployment", plan.deployment._id),
    horizonNodeId: tableRecordId("infrastructure_node", plan.horizon._id),
    tunnelConnectorId: tableRecordId("tunnel_connector", plan.connector._id),
    status: "pending",
    createdAt: now,
    updatedAt: now,
  })) as unknown as DeploymentRouteRow;
  let route = normalizeSurrealRow<DeploymentRouteRow>(created);
  assertTransition(ROUTE_TRANSITIONS, route.status, "validating");
  route = normalizeSurrealRow<DeploymentRouteRow>(
    await db.update(tableRecordId("deployment_route", route._id)).merge({
      status: "validating",
      updatedAt: new Date(),
    }),
  );
  assertTransition(ROUTE_TRANSITIONS, route.status, "active");
  route = normalizeSurrealRow<DeploymentRouteRow>(
    await db.update(tableRecordId("deployment_route", route._id)).merge({
      status: "active",
      activatedAt: new Date(),
      updatedAt: new Date(),
    }),
  );
  await appendAuditEvent({
    actorType: "user",
    actorId: plan.domain.userId,
    action: "deployment_route.activated",
    targetType: "deployment_route",
    targetId: route._id,
    studioId: plan.domain.studioId,
    outcome: "succeeded",
    details: {
      domainBindingId: plan.domain._id,
      deploymentId: plan.deployment._id,
      horizonNodeId: plan.horizon._id,
      tunnelConnectorId: plan.connector._id,
      status: route.status,
    },
  });
  return route;
}

export async function upsertTunnelConnector(input: {
  constellationId: string;
  habitatNodeId: string;
  horizonNodeId: string;
  connectorKey: string;
  status?: TunnelConnectorRow["status"];
  protocol?: TunnelConnectorRow["protocol"];
  metadata?: Record<string, unknown>;
}) {
  const [habitat, horizon] = await Promise.all([
    getInfrastructureNode(input.habitatNodeId),
    getInfrastructureNode(input.horizonNodeId),
  ]);
  if (!habitat || habitat.role !== "habitat") throw new Error("Invalid Habitat node");
  if (!horizon || horizon.role !== "horizon") throw new Error("Invalid Horizon node");
  if (
    normalizeRouteParam(habitat.constellationId) !== normalizeRouteParam(input.constellationId) ||
    normalizeRouteParam(horizon.constellationId) !== normalizeRouteParam(input.constellationId)
  ) {
    throw new Error("Tunnel nodes must belong to the same Constellation");
  }
  const db = await getSurreal();
  const rows = await queryRows<TunnelConnectorRow>(
    db,
    "SELECT * FROM tunnel_connector WHERE horizonNodeId = $horizonNodeId AND connectorKey = $connectorKey LIMIT 1",
    {
      horizonNodeId: tableRecordId("infrastructure_node", horizon._id),
      connectorKey: input.connectorKey,
    },
  );
  const now = new Date();
  const content = {
    constellationId: tableRecordId("constellation", input.constellationId),
    habitatNodeId: tableRecordId("infrastructure_node", habitat._id),
    horizonNodeId: tableRecordId("infrastructure_node", horizon._id),
    connectorKey: input.connectorKey,
    protocol: input.protocol ?? "nova-yamux-v1",
    status: input.status ?? "registering",
    ...(input.status === "online" ? { connectedAt: now, lastSeenAt: now } : {}),
    metadata: input.metadata ?? {},
    updatedAt: now,
  };
  if (rows[0]) {
    const existing = normalizeSurrealRow<TunnelConnectorRow>(rows[0]);
    const connector = normalizeSurrealRow<TunnelConnectorRow>(
      await db.update(tableRecordId("tunnel_connector", existing._id)).merge(content),
    );
    if (existing.status !== connector.status) {
      await appendAuditEvent({
        actorType: "node",
        actorId: habitat._id,
        action: "tunnel_connector.transitioned",
        targetType: "tunnel_connector",
        targetId: connector._id,
        outcome: "succeeded",
        details: {
          constellationId: input.constellationId,
          habitatNodeId: habitat._id,
          horizonNodeId: horizon._id,
          protocol: connector.protocol,
          previousStatus: existing.status,
          status: connector.status,
        },
      });
    }
    return connector;
  }
  const key = randomUUID().replaceAll("-", "");
  const connector = normalizeSurrealRow<TunnelConnectorRow>(
    (await db.create(new StringRecordId(`tunnel_connector:${key}`)).content({
      ...content,
      createdAt: now,
    })) as unknown as TunnelConnectorRow,
  );
  await appendAuditEvent({
    actorType: "node",
    actorId: habitat._id,
    action: "tunnel_connector.registered",
    targetType: "tunnel_connector",
    targetId: connector._id,
    outcome: "succeeded",
    details: {
      constellationId: input.constellationId,
      habitatNodeId: habitat._id,
      horizonNodeId: horizon._id,
      protocol: connector.protocol,
      status: connector.status,
    },
  });
  return connector;
}
