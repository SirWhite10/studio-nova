import { afterAll, describe, expect, it } from "vite-plus/test";

import { closeSurreal, getSurreal } from "./surreal";
import { listAuditEventsForTarget } from "./surreal-audit";
import {
  assertNodeRole,
  heartbeatInfrastructureNode,
  listInfrastructureNodes,
  nodeHeartbeatIsStale,
  normalizeInfrastructureKey,
  normalizeNodeCapabilities,
  reconcileStaleInfrastructure,
  registerInfrastructureNode,
} from "./surreal-infrastructure";

describe("infrastructure node contracts", () => {
  it("validates roles and canonicalizes node identity/capabilities", () => {
    expect(normalizeInfrastructureKey(" Habitat-ONE ")).toBe("habitat-one");
    expect(() => normalizeInfrastructureKey("bad_key")).toThrow("DNS-style");
    expect(() => assertNodeRole("database")).toThrow("forge, horizon, habitat");
    expect(
      normalizeNodeCapabilities({
        operatingSystems: ["Linux", "linux"],
        architectures: ["X86_64"],
        toolchains: ["Bun"],
        capacity: { cpu: 8, invalid: -1 },
      }),
    ).toEqual({
      operatingSystems: ["linux"],
      architectures: ["x86_64"],
      toolchains: ["bun"],
      runtimes: [],
      features: [],
      capacity: { cpu: 8 },
    });
  });

  it("treats missing and expired heartbeats as stale", () => {
    const now = Date.parse("2026-07-13T12:00:00Z");
    expect(nodeHeartbeatIsStale(undefined, now, 60_000)).toBe(true);
    expect(nodeHeartbeatIsStale("2026-07-13T11:59:30Z", now, 60_000)).toBe(false);
    expect(nodeHeartbeatIsStale("2026-07-13T11:58:00Z", now, 60_000)).toBe(true);
  });
});

const integration = process.env.INFRASTRUCTURE_INTEGRATION === "1" ? describe : describe.skip;

integration("infrastructure repository integration", () => {
  afterAll(async () => closeSurreal());

  it("registers every role, heartbeats capabilities, and expires stale nodes", async () => {
    const key = `${Date.now()}`;
    const constellationKey = `ops-${key}`;
    const registrations = await Promise.all(
      (["forge", "horizon", "habitat"] as const).map((role) =>
        registerInfrastructureNode({
          constellationKey,
          constellationName: "Operations Integration",
          nodeKey: `${role}-${key}`,
          role,
          displayName: `${role} integration`,
          hostname: `${role}-${key}.internal`,
          capabilities: {
            operatingSystems: ["linux"],
            architectures: ["x86_64"],
            toolchains: role === "forge" ? ["bun"] : [],
            runtimes: role === "habitat" ? ["k3s"] : [],
            features: [],
          },
          actorId: "integration-test",
        }),
      ),
    );
    const habitat = registrations.find(({ node }) => node.role === "habitat")!.node;
    const heartbeat = await heartbeatInfrastructureNode({
      nodeId: habitat._id,
      capabilities: {
        operatingSystems: ["linux"],
        architectures: ["x86_64"],
        toolchains: [],
        runtimes: ["k3s", "containerd"],
        features: ["persistent-volumes"],
      },
    });
    expect(heartbeat.capabilities.runtimes).toEqual(["containerd", "k3s"]);

    const staleAt = new Date(Date.now() - 10 * 60_000);
    const db = await getSurreal();
    const deploymentId = `ops_deployment_${key}`;
    const runtimeId = `ops_runtime_${key}`;
    await db.query(
      `
        CREATE type::record('deployment', $deploymentId) CONTENT {
          userId: 'fixture-user', studioId: studio:studio_one, environment: 'production',
          releaseId: release:ops_fixture, status: 'active', activatedAt: time::now(),
          createdAt: time::now(), updatedAt: time::now()
        };
        CREATE type::record('runtime_instance', $runtimeId) CONTENT {
          deploymentId: type::record('deployment', $deploymentId),
          nodeId: type::record('infrastructure_node', $nodeId), provider: 'integration',
          providerInstanceId: $runtimeId, status: 'healthy', serviceKey: $serviceKey,
          healthCheck: { path: '/' }, startedAt: time::now(),
          createdAt: time::now(), updatedAt: time::now()
        };
        UPDATE type::record('deployment', $deploymentId) SET
          activeRuntimeInstanceId = type::record('runtime_instance', $runtimeId);
      `,
      {
        deploymentId,
        runtimeId,
        nodeId: habitat._id,
        serviceKey: `ops-${key}.svc.cluster.local:4173`,
      },
    );
    await db.query(
      "UPDATE type::record('infrastructure_node', $nodeId) SET lastHeartbeatAt = $staleAt",
      { nodeId: habitat._id, staleAt },
    );
    const reconciled = await reconcileStaleInfrastructure({ staleAfterMs: 60_000 });
    const staleHabitat = reconciled.staleNodes.find(({ node }) => node._id === habitat._id);
    expect(staleHabitat?.affected.runtimeInstances).toBe(1);
    expect(staleHabitat?.affected.deployments).toBe(1);
    const nodes = await listInfrastructureNodes(registrations[0]!.constellation._id);
    expect(nodes).toHaveLength(3);
    expect(nodes.find((node) => node._id === habitat._id)?.status).toBe("offline");
    const [runtimeRows, deploymentRows] = await db.query<
      [{ status: string }[], { status: string }[]]
    >(
      "SELECT status FROM type::record('runtime_instance', $runtimeId); SELECT status FROM type::record('deployment', $deploymentId)",
      { runtimeId, deploymentId },
    );
    expect(runtimeRows[0]?.status).toBe("unhealthy");
    expect(deploymentRows[0]?.status).toBe("degraded");
    expect(
      (await listAuditEventsForTarget("infrastructure_node", habitat._id)).map(
        (event) => event.action,
      ),
    ).toEqual(
      expect.arrayContaining([
        "infrastructure.node.registered",
        "infrastructure.node.heartbeat",
        "infrastructure.node.heartbeat_expired",
      ]),
    );

    await expect(
      registerInfrastructureNode({
        constellationKey,
        nodeKey: `forge-${key}`,
        role: "habitat",
        displayName: "Conflicting role",
        hostname: "conflict.internal",
      }),
    ).rejects.toThrow("role is immutable");
  });
});
