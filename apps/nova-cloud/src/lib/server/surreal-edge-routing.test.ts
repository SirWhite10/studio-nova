import { afterAll, describe, expect, it } from "vite-plus/test";

import { closeSurreal, getSurreal } from "./surreal";
import { listAuditEventsForTarget } from "./surreal-audit";
import {
  activatePlannedDeploymentRoute,
  createDomainBinding,
  markDomainBindingVerified,
  markDomainCertificateActive,
  normalizeDomainHost,
  planDeploymentRoute,
  routeActivationReadiness,
  routeTenantMatches,
  upsertTunnelConnector,
} from "./surreal-edge-routing";

describe("Horizon route safety", () => {
  it("normalizes valid hosts and rejects malformed input", () => {
    expect(normalizeDomainHost(" App.Example.COM. ")).toBe("app.example.com");
    expect(() => normalizeDomainHost("localhost")).toThrow("Invalid domain host");
    expect(() => normalizeDomainHost("bad_label.example.com")).toThrow("Invalid domain host");
  });

  it("requires matching user and Studio ownership", () => {
    const domain = { userId: "user-one", studioId: "studio:one" };
    expect(routeTenantMatches(domain, { userId: "user-one", studioId: "studio:one" })).toBe(true);
    expect(routeTenantMatches(domain, { userId: "user-two", studioId: "studio:one" })).toBe(false);
    expect(routeTenantMatches(domain, { userId: "user-one", studioId: "studio:two" })).toBe(false);
  });

  it("accepts only a verified, healthy, connector-matched route", () => {
    const input = {
      domain: { ownershipStatus: "verified" as const, certificateStatus: "active" as const },
      deployment: { _id: "deployment-one", status: "active" as const },
      runtime: {
        deploymentId: "deployment:deployment-one",
        nodeId: "infrastructure_node:habitat-one",
        status: "healthy" as const,
      },
      connector: {
        habitatNodeId: "infrastructure_node:habitat-one",
        horizonNodeId: "infrastructure_node:horizon-one",
        status: "online" as const,
      },
      horizon: {
        _id: "horizon-one",
        role: "horizon" as const,
        status: "online",
      },
    };
    expect(routeActivationReadiness(input)).toBeNull();
    expect(
      routeActivationReadiness({
        ...input,
        deployment: { ...input.deployment, status: "degraded" },
      }),
    ).toBe("Deployment is not active");
    expect(
      routeActivationReadiness({
        ...input,
        connector: { ...input.connector, habitatNodeId: "infrastructure_node:other" },
      }),
    ).toBe("Tunnel Connector belongs to a different Habitat node");
  });
});

const integration = process.env.EDGE_ROUTING_INTEGRATION === "1" ? describe : describe.skip;

integration("Horizon route repository integration", () => {
  afterAll(async () => closeSurreal());

  it("activates only a tenant-safe route over the online connector", async () => {
    const key = `${Date.now()}`;
    const constellationId = `route_integration_${key}`;
    const habitatNodeId = `route_habitat_${key}`;
    const horizonNodeId = `route_horizon_${key}`;
    const deploymentId = `route_deployment_${key}`;
    const runtimeId = `route_runtime_${key}`;
    const host = `route-${key}.example.test`;
    const db = await getSurreal();
    await db.query(
      `
        CREATE type::record('constellation', $constellationId) CONTENT {
          key: $constellationId, name: 'Route Integration', status: 'active',
          metadata: {}, createdAt: time::now(), updatedAt: time::now()
        };
        CREATE type::record('infrastructure_node', $habitatNodeId) CONTENT {
          constellationId: type::record('constellation', $constellationId), nodeKey: $habitatNodeId,
          role: 'habitat', displayName: 'Route Habitat', hostname: $habitatNodeId,
          status: 'online', capabilities: {}, lastHeartbeatAt: time::now(), metadata: {},
          createdAt: time::now(), updatedAt: time::now()
        };
        CREATE type::record('infrastructure_node', $horizonNodeId) CONTENT {
          constellationId: type::record('constellation', $constellationId), nodeKey: $horizonNodeId,
          role: 'horizon', displayName: 'Route Horizon', hostname: $horizonNodeId,
          status: 'online', capabilities: {}, lastHeartbeatAt: time::now(), metadata: {},
          createdAt: time::now(), updatedAt: time::now()
        };
        CREATE type::record('deployment', $deploymentId) CONTENT {
          userId: 'fixture-user', studioId: studio:studio_one, environment: 'production',
          releaseId: release:route_fixture, status: 'active', activatedAt: time::now(),
          createdAt: time::now(), updatedAt: time::now()
        };
        CREATE type::record('runtime_instance', $runtimeId) CONTENT {
          deploymentId: type::record('deployment', $deploymentId),
          nodeId: type::record('infrastructure_node', $habitatNodeId), provider: 'integration',
          providerInstanceId: $runtimeId, status: 'healthy',
          serviceKey: $serviceKey, healthCheck: { path: '/' },
          startedAt: time::now(), createdAt: time::now(), updatedAt: time::now()
        };
        UPDATE type::record('deployment', $deploymentId) SET
          activeRuntimeInstanceId = type::record('runtime_instance', $runtimeId),
          updatedAt = time::now();
      `,
      {
        constellationId,
        habitatNodeId,
        horizonNodeId,
        deploymentId,
        runtimeId,
        serviceKey: `release-service.route-${key}.svc.cluster.local:4173`,
      },
    );

    const connector = await upsertTunnelConnector({
      constellationId,
      habitatNodeId,
      horizonNodeId,
      connectorKey: `route-connector-${key}`,
      status: "online",
    });
    const created = await createDomainBinding({
      userId: "fixture-user",
      studioId: "studio_one",
      host,
    });
    let binding = await markDomainBindingVerified({
      userId: "fixture-user",
      studioId: "studio_one",
      host,
    });
    binding = await markDomainCertificateActive(binding);

    const plan = await planDeploymentRoute({
      userId: "fixture-user",
      studioId: "studio_one",
      host,
      deploymentId,
    });
    expect(plan.domain._id).toBe(created.binding._id);
    expect(plan.connector._id).toBe(connector._id);
    const route = await activatePlannedDeploymentRoute(plan);
    expect(route.status).toBe("active");
    expect(
      (await listAuditEventsForTarget("deployment_route", route._id)).map((event) => event.action),
    ).toContain("deployment_route.activated");
    expect(
      (await listAuditEventsForTarget("tunnel_connector", connector._id)).map(
        (event) => event.action,
      ),
    ).toContain("tunnel_connector.registered");
    expect(
      (await listAuditEventsForTarget("domain_binding", binding._id)).map((event) => event.action),
    ).toEqual(
      expect.arrayContaining([
        "domain_binding.created",
        "domain_binding.verified",
        "domain_binding.certificate_activated",
      ]),
    );

    await db.query(
      "UPDATE type::record('tunnel_connector', $connectorId) SET status = 'offline', updatedAt = time::now()",
      { connectorId: connector._id },
    );
    await expect(
      planDeploymentRoute({
        userId: "fixture-user",
        studioId: "studio_one",
        host,
        deploymentId,
      }),
    ).rejects.toThrow("Tunnel Connector is not online");
    const [rows] = await db.query<[{ status: string }[]]>(
      "SELECT status FROM deployment_route WHERE domainBindingId = type::record('domain_binding', $domainBindingId)",
      { domainBindingId: binding._id },
    );
    expect(rows[0]?.status).toBe("active");
  });
});
