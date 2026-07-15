import { createHash } from "node:crypto";

import type { DatabaseConfig } from "./config.ts";
import { queryResult, querySurreal } from "./surreal-http.ts";

type LegacyRow = Record<string, unknown> & { id?: unknown };

function unknownText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return `${value}`;
  }
  try {
    return JSON.stringify(value) ?? "unknown";
  } catch {
    return "unknown";
  }
}

export interface BackfillSource {
  workspaces: LegacyRow[];
  sandboxes: LegacyRow[];
  deployments: LegacyRow[];
  runtimeProcesses: LegacyRow[];
  workspaceProxies: LegacyRow[];
  proxyDomains: LegacyRow[];
  frpClients: LegacyRow[];
}

export interface BackfillPlan {
  workbenches: number;
  workbenchInstances: number;
  buildJobs: number;
  releases: number;
  deployments: number;
  runtimeInstances: number;
  tunnelConnectors: number;
  domainBindings: number;
  deploymentRoutes: number;
  skipped: string[];
  statements: string[];
}

export interface BackfillResult {
  dryRun: boolean;
  plan: Omit<BackfillPlan, "statements">;
  statementCount: number;
}

function scalarString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object.tb === "string" && object.id !== undefined) {
      return `${object.tb}:${scalarString(object.id) ?? unknownText(object.id)}`;
    }
    if (typeof object.table === "string" && object.key !== undefined) {
      return `${object.table}:${scalarString(object.key) ?? unknownText(object.key)}`;
    }
  }
  return undefined;
}

function legacyIdentity(row: LegacyRow, fallback: string): string {
  return scalarString(row.id) ?? fallback;
}

function deterministicKey(kind: string, legacyId: string): string {
  return `legacy_${createHash("sha256").update(`${kind}:${legacyId}`).digest("hex").slice(0, 24)}`;
}

function recordKey(value: unknown, expectedTable?: string): string | undefined {
  const string = scalarString(value)?.trim();
  if (!string) return undefined;
  const separator = string.indexOf(":");
  if (separator < 0) return string;
  if (expectedTable && string.slice(0, separator) !== expectedTable)
    return string.slice(separator + 1);
  return string.slice(separator + 1);
}

function stringLiteral(value: string): string {
  return JSON.stringify(value);
}

function recordExpression(table: string, key: string): string {
  return `type::record(${stringLiteral(table)}, ${stringLiteral(key)})`;
}

function dateExpression(value: unknown): string {
  const numeric = typeof value === "number" ? value : Number(value);
  const date = Number.isFinite(numeric) && numeric > 0 ? new Date(numeric) : new Date();
  return `d${stringLiteral(date.toISOString())}`;
}

function optionalString(value: unknown): string {
  const string = scalarString(value);
  return string ? stringLiteral(string) : "NONE";
}

function workbenchStatus(value: unknown): string {
  switch (scalarString(value)?.toLowerCase()) {
    case "creating":
    case "provisioning":
      return "creating";
    case "busy":
    case "running":
      return "busy";
    case "paused":
    case "stopped":
      return "paused";
    case "expired":
      return "expired";
    case "failed":
    case "error":
      return "failed";
    case "archived":
      return "archived";
    default:
      return "ready";
  }
}

function instanceStatus(value: unknown): string {
  switch (scalarString(value)?.toLowerCase()) {
    case "creating":
    case "allocating":
      return "allocating";
    case "starting":
      return "starting";
    case "busy":
    case "running":
      return "busy";
    case "paused":
      return "paused";
    case "stopping":
      return "stopping";
    case "stopped":
      return "stopped";
    case "expired":
      return "expired";
    case "unhealthy":
      return "unhealthy";
    case "failed":
    case "error":
      return "failed";
    default:
      return "ready";
  }
}

function deploymentStatus(value: unknown): string {
  switch (scalarString(value)?.toLowerCase()) {
    case "active":
    case "running":
      return "active";
    case "building":
    case "provisioning":
      return "provisioning";
    case "verifying":
      return "verifying";
    case "failed":
    case "error":
      return "failed";
    case "stopped":
      return "stopped";
    case "superseded":
      return "superseded";
    default:
      return "ready";
  }
}

function runtimeStatus(value: unknown): string {
  switch (scalarString(value)?.toLowerCase()) {
    case "creating":
    case "provisioning":
      return "provisioning";
    case "starting":
      return "starting";
    case "active":
    case "ready":
    case "running":
      return "healthy";
    case "unhealthy":
      return "unhealthy";
    case "draining":
    case "stopping":
      return "draining";
    case "stopped":
    case "exited":
      return "stopped";
    default:
      return "failed";
  }
}

export function buildBackfillPlan(source: BackfillSource): BackfillPlan {
  const statements: string[] = [];
  const skipped: string[] = [];
  const workspaceMap = new Map<
    string,
    { key: string; studioKey: string; userId: string; activeDeploymentId?: string }
  >();
  const deploymentMap = new Map<string, { key: string; studioKey: string; userId: string }>();
  const deploymentByWorkspace = new Map<
    string,
    { key: string; studioKey: string; userId: string; revision: number }
  >();
  const runtimeDeploymentMap = new Map<
    string,
    { key: string; studioKey: string; userId: string }
  >();
  const proxyMap = new Map<string, LegacyRow>();
  const connectorMap = new Map<string, string>();
  let workbenches = 0;

  statements.push(
    "UPSERT constellation:legacy_compat CONTENT { key: 'legacy-compat', name: 'Legacy Compatibility', status: 'active', metadata: { managedBy: 'database-admin' }, createdAt: time::now(), updatedAt: time::now() };",
    "UPSERT infrastructure_node:legacy_habitat CONTENT { constellationId: constellation:legacy_compat, nodeKey: 'legacy-habitat', role: 'habitat', displayName: 'Legacy Habitat', hostname: 'legacy-habitat', status: 'offline', capabilities: { features: ['legacy-runtime'] }, metadata: { compatibility: true }, createdAt: time::now(), updatedAt: time::now() };",
    "UPSERT infrastructure_node:legacy_horizon CONTENT { constellationId: constellation:legacy_compat, nodeKey: 'legacy-horizon', role: 'horizon', displayName: 'Legacy Horizon', hostname: 'legacy-horizon', status: 'offline', capabilities: { features: ['legacy-frp'] }, metadata: { compatibility: true }, createdAt: time::now(), updatedAt: time::now() };",
    "UPSERT build_target_profile:legacy_web CONTENT { key: 'legacy-web', displayName: 'Legacy Web', platform: 'web', architecture: NONE, toolchain: 'legacy', requiredCapabilities: [], artifactKinds: [], enabled: true, metadata: { compatibility: true }, createdAt: time::now(), updatedAt: time::now() };",
  );

  source.workspaces.forEach((row, index) => {
    const legacyId = legacyIdentity(row, `workspace-${index}`);
    const studioKey = recordKey(row.studioId, "studio");
    const userId = scalarString(row.userId);
    if (!studioKey || !userId) {
      skipped.push(`workspace ${legacyId}: missing studioId or userId`);
      return;
    }

    const key = deterministicKey("workbench", legacyId);
    const activeDeploymentId = scalarString(row.activeDeploymentId);
    const mapped = { key, studioKey, userId, activeDeploymentId };
    workspaceMap.set(legacyId, mapped);
    workspaceMap.set(recordKey(legacyId) ?? legacyId, mapped);
    statements.push(
      `UPSERT ${recordExpression("workbench", key)} CONTENT { userId: ${stringLiteral(userId)}, studioId: ${recordExpression("studio", studioKey)}, name: ${stringLiteral(scalarString(row.name) ?? "Legacy Workbench")}, slug: ${stringLiteral(scalarString(row.slug) ?? key)}, status: ${stringLiteral(workbenchStatus(row.status))}, sourceVolumeKey: ${stringLiteral(scalarString(row.statePath) ?? `legacy-${key}`)}, activeInstanceId: NONE, defaultTargetProfileId: build_target_profile:legacy_web, legacyWorkspaceId: ${recordExpression("workspace", recordKey(legacyId, "workspace") ?? legacyId)}, metadata: { migratedFrom: ${stringLiteral(legacyId)} }, createdAt: ${dateExpression(row.createdAt)}, updatedAt: ${dateExpression(row.updatedAt)} };`,
    );
    workbenches += 1;
  });

  let workbenchInstances = 0;
  source.sandboxes.forEach((row, index) => {
    const legacyId = legacyIdentity(row, `sandbox-${index}`);
    const workspaceId = scalarString(row.workspaceId);
    const workbench = workspaceId
      ? (workspaceMap.get(workspaceId) ?? workspaceMap.get(recordKey(workspaceId) ?? workspaceId))
      : undefined;
    if (!workbench) {
      skipped.push(`sandbox ${legacyId}: no mapped workspace`);
      return;
    }

    const key = deterministicKey("workbench_instance", legacyId);
    statements.push(
      `UPSERT ${recordExpression("workbench_instance", key)} CONTENT { workbenchId: ${recordExpression("workbench", workbench.key)}, nodeId: infrastructure_node:legacy_habitat, provider: 'e2b', providerInstanceId: ${stringLiteral(scalarString(row.sandboxId) ?? legacyId)}, status: ${stringLiteral(instanceStatus(row.status))}, sourceMountPath: '/workspace', previewEndpoint: NONE, expiresAt: NONE, lastHeartbeatAt: NONE, failure: NONE, createdAt: ${dateExpression(row.createdAt)}, updatedAt: ${dateExpression(row.updatedAt)} };`,
      `UPDATE ${recordExpression("workbench", workbench.key)} SET activeInstanceId = ${recordExpression("workbench_instance", key)}, updatedAt = time::now();`,
    );
    workbenchInstances += 1;
  });

  let migratedDeployments = 0;
  source.deployments.forEach((row, index) => {
    const legacyId = legacyIdentity(row, `deployment-${index}`);
    const workspaceId = scalarString(row.workspaceId);
    const workbench = workspaceId
      ? (workspaceMap.get(workspaceId) ?? workspaceMap.get(recordKey(workspaceId) ?? workspaceId))
      : undefined;
    if (!workspaceId || !workbench) {
      skipped.push(`workspace_deployment ${legacyId}: no mapped workspace`);
      return;
    }

    const buildKey = deterministicKey("build_job", legacyId);
    const releaseKey = deterministicKey("release", legacyId);
    const deploymentKey = deterministicKey("deployment", legacyId);
    const ready = !["failed", "error"].includes(scalarString(row.status)?.toLowerCase() ?? "");
    const revision = Math.max(1, Number(row.revision) || 1);
    const createdAt = dateExpression(row.createdAt);
    const updatedAt = dateExpression(row.updatedAt);
    const legacyRecordKey = recordKey(legacyId, "workspace_deployment") ?? legacyId;

    statements.push(
      `UPSERT ${recordExpression("build_job", buildKey)} CONTENT { userId: ${stringLiteral(workbench.userId)}, studioId: ${recordExpression("studio", workbench.studioKey)}, workbenchId: ${recordExpression("workbench", workbench.key)}, targetProfileId: build_target_profile:legacy_web, nodeId: NONE, status: ${stringLiteral(ready ? "succeeded" : "failed")}, sourceRevision: ${stringLiteral(`legacy:${legacyId}`)}, releaseId: ${recordExpression("release", releaseKey)}, queuedAt: ${createdAt}, startedAt: ${createdAt}, endedAt: ${updatedAt}, failure: NONE, metadata: { compatibility: true }, createdAt: ${createdAt}, updatedAt: ${updatedAt} };`,
      `UPSERT ${recordExpression("release", releaseKey)} CONTENT { userId: ${stringLiteral(workbench.userId)}, studioId: ${recordExpression("studio", workbench.studioKey)}, workbenchId: ${recordExpression("workbench", workbench.key)}, buildJobId: ${recordExpression("build_job", buildKey)}, revision: ${revision}, sourceRevision: ${stringLiteral(`legacy:${legacyId}`)}, status: ${stringLiteral(ready ? "ready" : "failed")}, manifest: { compatibility: true, artifactPath: ${optionalString(row.artifactPath)}, outputDir: ${optionalString(row.outputDir)} }, legacyDeploymentId: ${recordExpression("workspace_deployment", legacyRecordKey)}, createdAt: ${createdAt} };`,
      `UPSERT ${recordExpression("deployment", deploymentKey)} CONTENT { userId: ${stringLiteral(workbench.userId)}, studioId: ${recordExpression("studio", workbench.studioKey)}, environment: 'production', releaseId: ${recordExpression("release", releaseKey)}, previousReleaseId: NONE, status: ${stringLiteral(deploymentStatus(row.status))}, activeRuntimeInstanceId: NONE, legacyDeploymentId: ${recordExpression("workspace_deployment", legacyRecordKey)}, activatedAt: NONE, failure: NONE, createdAt: ${createdAt}, updatedAt: ${updatedAt} };`,
    );
    deploymentMap.set(legacyId, {
      key: deploymentKey,
      studioKey: workbench.studioKey,
      userId: workbench.userId,
    });
    deploymentMap.set(legacyRecordKey, {
      key: deploymentKey,
      studioKey: workbench.studioKey,
      userId: workbench.userId,
    });
    const workspaceLookupKey = recordKey(workspaceId) ?? workspaceId;
    const currentDeployment = deploymentByWorkspace.get(workspaceLookupKey);
    if (!currentDeployment || revision >= currentDeployment.revision) {
      deploymentByWorkspace.set(workspaceLookupKey, {
        key: deploymentKey,
        studioKey: workbench.studioKey,
        userId: workbench.userId,
        revision,
      });
    }
    migratedDeployments += 1;
  });

  let runtimeInstances = 0;
  source.runtimeProcesses.forEach((row, index) => {
    const legacyId = legacyIdentity(row, `runtime-process-${index}`);
    const workspaceId = scalarString(row.workspaceId);
    const workspaceLookupKey = workspaceId ? (recordKey(workspaceId) ?? workspaceId) : undefined;
    const workbench = workspaceId
      ? (workspaceMap.get(workspaceId) ?? workspaceMap.get(workspaceLookupKey ?? workspaceId))
      : undefined;
    const deployment =
      (workbench?.activeDeploymentId
        ? (deploymentMap.get(workbench.activeDeploymentId) ??
          deploymentMap.get(
            recordKey(workbench.activeDeploymentId) ?? workbench.activeDeploymentId,
          ))
        : undefined) ??
      (workspaceLookupKey ? deploymentByWorkspace.get(workspaceLookupKey) : undefined);
    if (!workbench || !deployment) {
      skipped.push(`runtime_process ${legacyId}: no mapped workspace deployment`);
      return;
    }

    const key = deterministicKey("runtime_instance", legacyId);
    const status = runtimeStatus(row.status);
    const createdAt = dateExpression(row.createdAt);
    const updatedAt = dateExpression(row.updatedAt);
    const providerInstanceId = `${scalarString(row.sandboxId) ?? "legacy"}:${scalarString(row.pid) ?? legacyId}`;
    const serviceKey = `legacy-${deterministicKey("service", legacyId).slice(7)}`;
    const legacyRecordKey = recordKey(legacyId, "runtime_process") ?? legacyId;
    statements.push(
      `UPSERT ${recordExpression("runtime_instance", key)} CONTENT { deploymentId: ${recordExpression("deployment", deployment.key)}, nodeId: infrastructure_node:legacy_habitat, provider: 'legacy-process', providerInstanceId: ${stringLiteral(providerInstanceId)}, status: ${stringLiteral(status)}, serviceKey: ${stringLiteral(serviceKey)}, healthCheck: { path: ${optionalString(row.healthCheckPath)}, port: ${typeof row.port === "number" ? row.port : "NONE"}, previewUrl: ${optionalString(row.previewUrl)} }, legacyRuntimeProcessId: ${recordExpression("runtime_process", legacyRecordKey)}, startedAt: ${status === "healthy" ? createdAt : "NONE"}, stoppedAt: ${status === "stopped" ? updatedAt : "NONE"}, failure: NONE, createdAt: ${createdAt}, updatedAt: ${updatedAt} };`,
      `UPDATE ${recordExpression("deployment", deployment.key)} SET activeRuntimeInstanceId = ${recordExpression("runtime_instance", key)}, updatedAt = time::now();`,
    );
    const mappedDeployment = {
      key: deployment.key,
      studioKey: deployment.studioKey,
      userId: deployment.userId,
    };
    runtimeDeploymentMap.set(legacyId, mappedDeployment);
    runtimeDeploymentMap.set(legacyRecordKey, mappedDeployment);
    runtimeInstances += 1;
  });

  let tunnelConnectors = 0;
  source.frpClients.forEach((row, index) => {
    const legacyId = legacyIdentity(row, `frp-client-${index}`);
    const clientId = scalarString(row.clientId) ?? legacyId;
    const key = deterministicKey("tunnel_connector", legacyId);
    connectorMap.set(clientId, key);
    connectorMap.set(legacyId, key);
    statements.push(
      `UPSERT ${recordExpression("tunnel_connector", key)} CONTENT { constellationId: constellation:legacy_compat, habitatNodeId: infrastructure_node:legacy_habitat, horizonNodeId: infrastructure_node:legacy_horizon, connectorKey: ${stringLiteral(`frp:${clientId}`)}, protocol: 'frp', status: ${stringLiteral(scalarString(row.status) === "online" ? "online" : "offline")}, legacyFrpClientId: ${recordExpression("frp_client", recordKey(legacyId, "frp_client") ?? legacyId)}, connectedAt: NONE, lastSeenAt: NONE, metadata: { compatibility: true }, createdAt: time::now(), updatedAt: time::now() };`,
    );
    tunnelConnectors += 1;
  });

  for (const row of source.workspaceProxies) {
    const id = legacyIdentity(row, `workspace-proxy-${proxyMap.size}`);
    proxyMap.set(id, row);
    proxyMap.set(recordKey(id) ?? id, row);
  }

  let domainBindings = 0;
  let deploymentRoutes = 0;
  source.proxyDomains.forEach((row, index) => {
    const legacyId = legacyIdentity(row, `proxy-domain-${index}`);
    const proxyId = scalarString(row.proxyId);
    const proxy = proxyId
      ? (proxyMap.get(proxyId) ?? proxyMap.get(recordKey(proxyId) ?? proxyId))
      : undefined;
    if (!proxy) {
      skipped.push(`proxy_domain ${legacyId}: no mapped workspace_proxy`);
      return;
    }
    const studioKey = recordKey(proxy.studioId, "studio");
    const userId = scalarString(proxy.userId);
    const host = scalarString(row.host);
    if (!studioKey || !userId || !host) {
      skipped.push(`proxy_domain ${legacyId}: missing studio/user/host`);
      return;
    }

    const domainKey = deterministicKey("domain_binding", legacyId);
    statements.push(
      `UPSERT ${recordExpression("domain_binding", domainKey)} CONTENT { userId: ${stringLiteral(userId)}, studioId: ${recordExpression("studio", studioKey)}, host: ${stringLiteral(host.toLowerCase())}, kind: ${stringLiteral(scalarString(row.kind) === "platform" ? "platform" : "custom")}, ownershipStatus: ${stringLiteral(scalarString(row.status) === "active" || scalarString(row.status) === "verified" ? "verified" : "pending")}, certificateStatus: ${stringLiteral(scalarString(row.status) === "active" ? "active" : "pending")}, verificationToken: ${optionalString(row.verificationToken)}, legacyProxyDomainId: ${recordExpression("proxy_domain", recordKey(legacyId, "proxy_domain") ?? legacyId)}, verifiedAt: NONE, createdAt: ${dateExpression(row.createdAt)}, updatedAt: ${dateExpression(row.updatedAt)} };`,
    );
    domainBindings += 1;

    const runtimeId = scalarString(proxy.runtimeId);
    const deployment = runtimeId
      ? (runtimeDeploymentMap.get(runtimeId) ??
        runtimeDeploymentMap.get(recordKey(runtimeId) ?? runtimeId) ??
        deploymentMap.get(runtimeId) ??
        deploymentMap.get(recordKey(runtimeId) ?? runtimeId))
      : undefined;
    const connectorKey = connectorMap.get(scalarString(proxy.frpcClientId) ?? "");
    if (!deployment || deployment.studioKey !== studioKey || !connectorKey) {
      skipped.push(
        `proxy_domain ${legacyId}: route lacks a tenant-matched deployment or connector`,
      );
      return;
    }

    const routeKey = deterministicKey("deployment_route", legacyId);
    statements.push(
      `UPSERT ${recordExpression("deployment_route", routeKey)} CONTENT { domainBindingId: ${recordExpression("domain_binding", domainKey)}, deploymentId: ${recordExpression("deployment", deployment.key)}, horizonNodeId: infrastructure_node:legacy_horizon, tunnelConnectorId: ${recordExpression("tunnel_connector", connectorKey)}, status: 'disabled', legacyWorkspaceProxyId: ${recordExpression("workspace_proxy", recordKey(legacyIdentity(proxy, proxyId ?? "proxy"), "workspace_proxy") ?? proxyId ?? "proxy")}, activatedAt: NONE, failure: NONE, createdAt: time::now(), updatedAt: time::now() };`,
    );
    deploymentRoutes += 1;
  });

  return {
    workbenches,
    workbenchInstances,
    buildJobs: migratedDeployments,
    releases: migratedDeployments,
    deployments: migratedDeployments,
    runtimeInstances,
    tunnelConnectors,
    domainBindings,
    deploymentRoutes,
    skipped,
    statements,
  };
}

export async function loadBackfillSource(config: DatabaseConfig): Promise<BackfillSource> {
  const table = async (name: string): Promise<LegacyRow[]> => {
    try {
      return await queryResult<LegacyRow[]>(config, `SELECT * FROM ${name};`);
    } catch (error) {
      if (error instanceof Error && /table .* does not exist|not found/i.test(error.message))
        return [];
      throw error;
    }
  };

  const [
    workspaces,
    sandboxes,
    deployments,
    runtimeProcesses,
    workspaceProxies,
    proxyDomains,
    frpClients,
  ] = await Promise.all([
    table("workspace"),
    table("sandbox"),
    table("workspace_deployment"),
    table("runtime_process"),
    table("workspace_proxy"),
    table("proxy_domain"),
    table("frp_client"),
  ]);

  return {
    workspaces,
    sandboxes,
    deployments,
    runtimeProcesses,
    workspaceProxies,
    proxyDomains,
    frpClients,
  };
}

export async function runBackfill(
  config: DatabaseConfig,
  options: { dryRun?: boolean } = {},
): Promise<BackfillResult> {
  const source = await loadBackfillSource(config);
  const plan = buildBackfillPlan(source);
  const { statements, ...summary } = plan;

  if (!options.dryRun && statements.length) {
    // Each operation is an idempotent UPSERT/UPDATE. Sequential execution keeps
    // failures attributable and safely resumable on the next invocation.
    for (const statement of statements) await querySurreal(config, statement);
  }

  return {
    dryRun: options.dryRun ?? false,
    plan: summary,
    statementCount: statements.length,
  };
}

export async function verifyBackfill(config: DatabaseConfig): Promise<Record<string, number>> {
  const tableCounts = await queryResult<Array<Record<string, number>>>(
    config,
    "RETURN { workbench: array::len(SELECT id FROM workbench), workbenchInstance: array::len(SELECT id FROM workbench_instance), release: array::len(SELECT id FROM release), deployment: array::len(SELECT id FROM deployment), domainBinding: array::len(SELECT id FROM domain_binding), route: array::len(SELECT id FROM deployment_route) };",
  );
  return tableCounts[0] ?? {};
}
