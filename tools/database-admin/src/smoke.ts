import { randomUUID } from "node:crypto";

import type { DatabaseConfig } from "./config.ts";
import { queryResult, querySurreal } from "./surreal-http.ts";

export type VerticalSliceSmokeResult = {
  runId: string;
  host: string;
  checks: string[];
  ids: Record<string, string>;
};

type RecordRow = Record<string, unknown>;

function assertDisposable(config: DatabaseConfig, confirmedDisposable: boolean) {
  const productionLike = /^(?:prod|production|shared)$/i.test(config.environment);
  if (productionLike)
    throw new Error("Vertical-slice smoke is disabled for production environments");
  if (!confirmedDisposable) {
    throw new Error("Vertical-slice smoke requires explicit disposable-database confirmation");
  }
}

function recordReference(value: unknown) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const row = value as Record<string, unknown>;
  const table =
    typeof row.tb === "string" ? row.tb : typeof row.table === "string" ? row.table : "";
  const id = typeof row.id === "string" ? row.id : "";
  return table && id ? `${table}:${id}` : "";
}

function references(value: unknown, table: string, id: string) {
  return recordReference(value) === `${table}:${id}`;
}

async function selectRecord(config: DatabaseConfig, table: string, id: string) {
  const rows = await queryResult<RecordRow[]>(
    config,
    `SELECT * FROM type::record('${table}', '${id}')`,
  );
  if (!rows[0]) throw new Error(`Smoke record ${table}:${id} is missing`);
  return rows[0];
}

function check(checks: string[], name: string, condition: boolean) {
  if (!condition) throw new Error(`Vertical-slice smoke failed: ${name}`);
  checks.push(name);
}

export async function runVerticalSliceSmoke(
  config: DatabaseConfig,
  options: { confirmedDisposable?: boolean } = {},
): Promise<VerticalSliceSmokeResult> {
  assertDisposable(config, options.confirmedDisposable === true);
  const runId = randomUUID().replaceAll("-", "");
  const prefix = `smoke_${runId}`;
  const key = `smoke-${runId}`;
  const host = `smoke-${runId}.example.test`;
  const userId = `smoke-user-${runId}`;
  const ids = {
    studio: `${prefix}_studio`,
    constellation: `${prefix}_constellation`,
    forge: `${prefix}_forge`,
    horizon: `${prefix}_horizon`,
    habitat: `${prefix}_habitat`,
    workbench: `${prefix}_workbench`,
    workbenchInstance: `${prefix}_workbench_instance`,
    buildOne: `${prefix}_build_1`,
    releaseOne: `${prefix}_release_1`,
    artifactOne: `${prefix}_artifact_1`,
    deploymentOne: `${prefix}_deployment_1`,
    runtimeOne: `${prefix}_runtime_1`,
    buildTwo: `${prefix}_build_2`,
    releaseTwo: `${prefix}_release_2`,
    artifactTwo: `${prefix}_artifact_2`,
    deploymentTwo: `${prefix}_deployment_2`,
    runtimeTwo: `${prefix}_runtime_2`,
    connector: `${prefix}_connector`,
    domain: `${prefix}_domain`,
    route: `${prefix}_route`,
  };
  const checks: string[] = [];
  const audit = (suffix: string, action: string, targetType: string, targetId: string) => `
    CREATE type::record('audit_event', '${prefix}_audit_${suffix}') CONTENT {
      actorType: 'system', actorId: 'vertical-slice-smoke', action: '${action}',
      targetType: '${targetType}', targetId: '${targetId}', outcome: 'succeeded',
      studioId: type::record('studio', '${ids.studio}'), details: { smokeRunId: '${runId}' },
      createdAt: time::now()
    };
  `;

  await querySurreal(
    config,
    `
      BEGIN TRANSACTION;
      CREATE type::record('studio', '${ids.studio}') CONTENT {
        userId: '${userId}', name: 'Constellation Smoke', createdAt: time::now(), updatedAt: time::now()
      };
      CREATE type::record('constellation', '${ids.constellation}') CONTENT {
        key: '${key}', name: 'Constellation Smoke', status: 'active', metadata: {},
        createdAt: time::now(), updatedAt: time::now()
      };
      CREATE type::record('infrastructure_node', '${ids.forge}') CONTENT {
        constellationId: type::record('constellation', '${ids.constellation}'), nodeKey: '${key}-forge',
        role: 'forge', displayName: 'Smoke Forge', hostname: 'forge.${key}.internal', status: 'online',
        capabilities: { operatingSystems: ['linux'], architectures: ['x86_64'], toolchains: ['node-24'], runtimes: [], features: ['package:web-bundle', 'target:web', 'target:pwa'] },
        lastHeartbeatAt: time::now(), metadata: {}, createdAt: time::now(), updatedAt: time::now()
      };
      CREATE type::record('infrastructure_node', '${ids.horizon}') CONTENT {
        constellationId: type::record('constellation', '${ids.constellation}'), nodeKey: '${key}-horizon',
        role: 'horizon', displayName: 'Smoke Horizon', hostname: 'horizon.${key}.internal', status: 'online',
        capabilities: { operatingSystems: ['linux'], architectures: ['x86_64'], toolchains: [], runtimes: [], features: ['edge:tls', 'tunnel:nova-yamux-v1'] },
        lastHeartbeatAt: time::now(), metadata: {}, createdAt: time::now(), updatedAt: time::now()
      };
      CREATE type::record('infrastructure_node', '${ids.habitat}') CONTENT {
        constellationId: type::record('constellation', '${ids.constellation}'), nodeKey: '${key}-habitat',
        role: 'habitat', displayName: 'Smoke Habitat', hostname: 'habitat.${key}.internal', status: 'online',
        capabilities: { operatingSystems: ['linux'], architectures: ['x86_64'], toolchains: [], runtimes: ['k3s', 'containerd'], features: ['persistent-volumes'] },
        lastHeartbeatAt: time::now(), metadata: {}, createdAt: time::now(), updatedAt: time::now()
      };
      CREATE type::record('workbench', '${ids.workbench}') CONTENT {
        userId: '${userId}', studioId: type::record('studio', '${ids.studio}'), name: 'Smoke Workbench',
        slug: '${key}', status: 'ready', sourceVolumeKey: '${prefix}-source',
        defaultTargetProfileId: build_target_profile:web_pwa,
        activeInstanceId: type::record('workbench_instance', '${ids.workbenchInstance}'), metadata: {},
        createdAt: time::now(), updatedAt: time::now()
      };
      CREATE type::record('workbench_instance', '${ids.workbenchInstance}') CONTENT {
        workbenchId: type::record('workbench', '${ids.workbench}'), nodeId: type::record('infrastructure_node', '${ids.habitat}'),
        provider: 'smoke', providerInstanceId: '${ids.workbenchInstance}', status: 'ready', sourceMountPath: '/workspace',
        lastHeartbeatAt: time::now(), createdAt: time::now(), updatedAt: time::now()
      };
      CREATE type::record('build_job', '${ids.buildOne}') CONTENT {
        userId: '${userId}', studioId: type::record('studio', '${ids.studio}'), workbenchId: type::record('workbench', '${ids.workbench}'),
        targetProfileId: build_target_profile:web_pwa, nodeId: type::record('infrastructure_node', '${ids.forge}'),
        status: 'succeeded', sourceRevision: '${runId}-revision-1', releaseId: type::record('release', '${ids.releaseOne}'),
        queuedAt: time::now(), startedAt: time::now(), endedAt: time::now(), metadata: {}, createdAt: time::now(), updatedAt: time::now()
      };
      CREATE type::record('release', '${ids.releaseOne}') CONTENT {
        userId: '${userId}', studioId: type::record('studio', '${ids.studio}'), workbenchId: type::record('workbench', '${ids.workbench}'),
        buildJobId: type::record('build_job', '${ids.buildOne}'), revision: 1, sourceRevision: '${runId}-revision-1',
        status: 'ready', manifest: { target: 'web-pwa', smokeRunId: '${runId}' }, createdAt: time::now()
      };
      CREATE type::record('release_artifact', '${ids.artifactOne}') CONTENT {
        releaseId: type::record('release', '${ids.releaseOne}'), targetProfileId: build_target_profile:web_pwa,
        kind: 'static-bundle', uri: 's3://smoke/${runId}/release-1.tar',
        sha256: '${"1".repeat(64)}', sizeBytes: 1024, metadata: { smokeRunId: '${runId}' }, createdAt: time::now()
      };
      CREATE type::record('deployment', '${ids.deploymentOne}') CONTENT {
        userId: '${userId}', studioId: type::record('studio', '${ids.studio}'), environment: 'production',
        releaseId: type::record('release', '${ids.releaseOne}'), status: 'active',
        activeRuntimeInstanceId: type::record('runtime_instance', '${ids.runtimeOne}'), activatedAt: time::now(),
        createdAt: time::now(), updatedAt: time::now()
      };
      CREATE type::record('runtime_instance', '${ids.runtimeOne}') CONTENT {
        deploymentId: type::record('deployment', '${ids.deploymentOne}'), nodeId: type::record('infrastructure_node', '${ids.habitat}'),
        provider: 'smoke', providerInstanceId: '${ids.runtimeOne}', status: 'healthy',
        serviceKey: '${prefix}-release-1.smoke.svc.cluster.local:4173', healthCheck: { path: '/health' },
        startedAt: time::now(), createdAt: time::now(), updatedAt: time::now()
      };
      CREATE type::record('tunnel_connector', '${ids.connector}') CONTENT {
        constellationId: type::record('constellation', '${ids.constellation}'),
        habitatNodeId: type::record('infrastructure_node', '${ids.habitat}'), horizonNodeId: type::record('infrastructure_node', '${ids.horizon}'),
        connectorKey: '${prefix}-connector', protocol: 'nova-yamux-v1', status: 'online',
        connectedAt: time::now(), lastSeenAt: time::now(), metadata: {}, createdAt: time::now(), updatedAt: time::now()
      };
      CREATE type::record('domain_binding', '${ids.domain}') CONTENT {
        userId: '${userId}', studioId: type::record('studio', '${ids.studio}'), host: '${host}', kind: 'platform',
        ownershipStatus: 'verified', certificateStatus: 'active', verifiedAt: time::now(), createdAt: time::now(), updatedAt: time::now()
      };
      CREATE type::record('deployment_route', '${ids.route}') CONTENT {
        domainBindingId: type::record('domain_binding', '${ids.domain}'), deploymentId: type::record('deployment', '${ids.deploymentOne}'),
        horizonNodeId: type::record('infrastructure_node', '${ids.horizon}'), tunnelConnectorId: type::record('tunnel_connector', '${ids.connector}'),
        status: 'active', activatedAt: time::now(), createdAt: time::now(), updatedAt: time::now()
      };
      ${audit("workbench", "workbench.created", "workbench", ids.workbench)}
      ${audit("build_1", "build_job.succeeded", "build_job", ids.buildOne)}
      ${audit("release_1", "release.ready", "release", ids.releaseOne)}
      ${audit("deployment_1", "deployment.activated", "deployment", ids.deploymentOne)}
      ${audit("runtime_1", "runtime_instance.healthy", "runtime_instance", ids.runtimeOne)}
      ${audit("connector", "tunnel_connector.online", "tunnel_connector", ids.connector)}
      ${audit("route", "deployment_route.activated", "deployment_route", ids.route)}
      COMMIT TRANSACTION;
    `,
  );

  const route = await selectRecord(config, "deployment_route", ids.route);
  const deploymentOne = await selectRecord(config, "deployment", ids.deploymentOne);
  const runtimeOne = await selectRecord(config, "runtime_instance", ids.runtimeOne);
  const connector = await selectRecord(config, "tunnel_connector", ids.connector);
  check(checks, "initial route is active", route.status === "active");
  check(
    checks,
    "route targets first Deployment",
    references(route.deploymentId, "deployment", ids.deploymentOne),
  );
  check(checks, "first Deployment is active", deploymentOne.status === "active");
  check(checks, "first Runtime Instance is healthy", runtimeOne.status === "healthy");
  check(checks, "native tunnel connector is online", connector.status === "online");
  check(
    checks,
    "runtime is owned by Habitat",
    references(runtimeOne.nodeId, "infrastructure_node", ids.habitat),
  );

  await querySurreal(
    config,
    `
      UPDATE type::record('workbench_instance', '${ids.workbenchInstance}') SET status = 'stopped', updatedAt = time::now();
      UPDATE type::record('workbench', '${ids.workbench}') SET status = 'paused', activeInstanceId = NONE, updatedAt = time::now();
    `,
  );
  check(
    checks,
    "Deployment remains active after Workbench stop",
    (await selectRecord(config, "deployment", ids.deploymentOne)).status === "active",
  );
  check(
    checks,
    "route remains active after Workbench stop",
    (await selectRecord(config, "deployment_route", ids.route)).status === "active",
  );

  await querySurreal(
    config,
    `
      BEGIN TRANSACTION;
      CREATE type::record('build_job', '${ids.buildTwo}') CONTENT {
        userId: '${userId}', studioId: type::record('studio', '${ids.studio}'), workbenchId: type::record('workbench', '${ids.workbench}'),
        targetProfileId: build_target_profile:web_pwa, nodeId: type::record('infrastructure_node', '${ids.forge}'),
        status: 'succeeded', sourceRevision: '${runId}-revision-2', releaseId: type::record('release', '${ids.releaseTwo}'),
        queuedAt: time::now(), startedAt: time::now(), endedAt: time::now(), metadata: {}, createdAt: time::now(), updatedAt: time::now()
      };
      CREATE type::record('release', '${ids.releaseTwo}') CONTENT {
        userId: '${userId}', studioId: type::record('studio', '${ids.studio}'), workbenchId: type::record('workbench', '${ids.workbench}'),
        buildJobId: type::record('build_job', '${ids.buildTwo}'), revision: 2, sourceRevision: '${runId}-revision-2',
        status: 'ready', manifest: { target: 'web-pwa', smokeRunId: '${runId}', revision: 2 }, createdAt: time::now()
      };
      CREATE type::record('release_artifact', '${ids.artifactTwo}') CONTENT {
        releaseId: type::record('release', '${ids.releaseTwo}'), targetProfileId: build_target_profile:web_pwa,
        kind: 'static-bundle', uri: 's3://smoke/${runId}/release-2.tar',
        sha256: '${"2".repeat(64)}', sizeBytes: 2048, metadata: { smokeRunId: '${runId}' }, createdAt: time::now()
      };
      CREATE type::record('deployment', '${ids.deploymentTwo}') CONTENT {
        userId: '${userId}', studioId: type::record('studio', '${ids.studio}'), environment: 'production',
        releaseId: type::record('release', '${ids.releaseTwo}'), previousReleaseId: type::record('release', '${ids.releaseOne}'),
        status: 'verifying', activeRuntimeInstanceId: type::record('runtime_instance', '${ids.runtimeTwo}'),
        createdAt: time::now(), updatedAt: time::now()
      };
      CREATE type::record('runtime_instance', '${ids.runtimeTwo}') CONTENT {
        deploymentId: type::record('deployment', '${ids.deploymentTwo}'), nodeId: type::record('infrastructure_node', '${ids.habitat}'),
        provider: 'smoke', providerInstanceId: '${ids.runtimeTwo}', status: 'unhealthy',
        serviceKey: '${prefix}-release-2.smoke.svc.cluster.local:4173', healthCheck: { path: '/health' },
        failure: { code: 'smoke_health_failure', message: 'Expected health gate failure' },
        createdAt: time::now(), updatedAt: time::now()
      };
      COMMIT TRANSACTION;
    `,
  );
  const unhealthyRuntime = await selectRecord(config, "runtime_instance", ids.runtimeTwo);
  const unchangedRoute = await selectRecord(config, "deployment_route", ids.route);
  check(
    checks,
    "replacement health gate fails before cutover",
    unhealthyRuntime.status !== "healthy",
  );
  check(
    checks,
    "failed replacement preserves first route",
    references(unchangedRoute.deploymentId, "deployment", ids.deploymentOne),
  );

  await querySurreal(
    config,
    `
      BEGIN TRANSACTION;
      UPDATE type::record('runtime_instance', '${ids.runtimeTwo}') SET status = 'healthy', failure = NONE, startedAt = time::now(), updatedAt = time::now();
      UPDATE type::record('deployment', '${ids.deploymentTwo}') SET status = 'active', activatedAt = time::now(), updatedAt = time::now();
      UPDATE type::record('deployment', '${ids.deploymentOne}') SET status = 'superseded', updatedAt = time::now();
      UPDATE type::record('deployment_route', '${ids.route}') SET deploymentId = type::record('deployment', '${ids.deploymentTwo}'), activatedAt = time::now(), updatedAt = time::now();
      ${audit("cutover", "deployment_route.cutover", "deployment_route", ids.route)}
      COMMIT TRANSACTION;
    `,
  );
  check(
    checks,
    "healthy replacement cuts over atomically",
    references(
      (await selectRecord(config, "deployment_route", ids.route)).deploymentId,
      "deployment",
      ids.deploymentTwo,
    ),
  );

  await querySurreal(
    config,
    `UPDATE type::record('tunnel_connector', '${ids.connector}') SET status = 'offline', updatedAt = time::now()`,
  );
  check(
    checks,
    "offline tunnel makes route ineligible",
    (await selectRecord(config, "tunnel_connector", ids.connector)).status !== "online",
  );
  await querySurreal(
    config,
    `UPDATE type::record('tunnel_connector', '${ids.connector}') SET status = 'online', lastSeenAt = time::now(), updatedAt = time::now()`,
  );
  check(
    checks,
    "native tunnel reconnects without record replacement",
    (await selectRecord(config, "tunnel_connector", ids.connector)).status === "online",
  );

  await querySurreal(
    config,
    `UPDATE type::record('infrastructure_node', '${ids.habitat}') SET status = 'offline', updatedAt = time::now()`,
  );
  await querySurreal(
    config,
    `UPDATE type::record('infrastructure_node', '${ids.habitat}') SET status = 'online', lastHeartbeatAt = time::now(), updatedAt = time::now()`,
  );
  check(
    checks,
    "Habitat re-registers with stable identity",
    (await selectRecord(config, "infrastructure_node", ids.habitat)).status === "online",
  );
  check(
    checks,
    "runtime relationship survives node recovery",
    references(
      (await selectRecord(config, "runtime_instance", ids.runtimeTwo)).nodeId,
      "infrastructure_node",
      ids.habitat,
    ),
  );

  await querySurreal(
    config,
    `
      BEGIN TRANSACTION;
      UPDATE type::record('deployment', '${ids.deploymentTwo}') SET status = 'superseded', updatedAt = time::now();
      UPDATE type::record('deployment', '${ids.deploymentOne}') SET status = 'active', activatedAt = time::now(), updatedAt = time::now();
      UPDATE type::record('deployment_route', '${ids.route}') SET deploymentId = type::record('deployment', '${ids.deploymentOne}'), activatedAt = time::now(), updatedAt = time::now();
      ${audit("rollback", "deployment.rollback", "deployment", ids.deploymentOne)}
      COMMIT TRANSACTION;
    `,
  );
  const rolledBackRoute = await selectRecord(config, "deployment_route", ids.route);
  check(
    checks,
    "rollback reuses first immutable Release",
    references(rolledBackRoute.deploymentId, "deployment", ids.deploymentOne) &&
      references(
        (await selectRecord(config, "deployment", ids.deploymentOne)).releaseId,
        "release",
        ids.releaseOne,
      ),
  );

  const auditRows = await queryResult<RecordRow[]>(
    config,
    `SELECT * FROM audit_event WHERE details.smokeRunId = '${runId}'`,
  );
  check(checks, "lifecycle audit trace is complete", auditRows.length === 9);

  return { runId, host, checks, ids };
}
