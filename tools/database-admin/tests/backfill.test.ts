import { describe, expect, it } from "vite-plus/test";

import { buildBackfillPlan, type BackfillSource } from "../src/backfill.ts";

const source: BackfillSource = {
  workspaces: [
    {
      id: "workspace:legacy-one",
      userId: "user-1",
      studioId: "studio:studio-1",
      name: "Legacy",
      slug: "legacy",
      status: "ready",
      statePath: "/state/legacy",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_100_000,
    },
  ],
  sandboxes: [
    {
      id: "sandbox:legacy-sandbox",
      workspaceId: "workspace:legacy-one",
      sandboxId: "e2b-1",
      status: "running",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_100_000,
    },
  ],
  deployments: [
    {
      id: "workspace_deployment:legacy-deploy",
      workspaceId: "workspace:legacy-one",
      revision: 1,
      status: "active",
      artifactPath: "/artifact",
      outputDir: "dist",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_100_000,
    },
  ],
  runtimeProcesses: [
    {
      id: "runtime_process:legacy-runtime",
      workspaceId: "workspace:legacy-one",
      sandboxId: "e2b-1",
      pid: 42,
      status: "running",
      port: 3000,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_100_000,
    },
  ],
  workspaceProxies: [
    {
      id: "workspace_proxy:legacy-proxy",
      userId: "user-1",
      studioId: "studio:studio-1",
      runtimeId: "runtime_process:legacy-runtime",
      frpcClientId: "frp-1",
    },
  ],
  proxyDomains: [
    {
      id: "proxy_domain:legacy-domain",
      proxyId: "workspace_proxy:legacy-proxy",
      host: "example.test",
      kind: "custom",
      status: "active",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_100_000,
    },
  ],
  frpClients: [{ id: "frp_client:legacy-frp", clientId: "frp-1", status: "online" }],
};

describe("legacy backfill planning", () => {
  it("creates one deterministic new lifecycle per legacy record", () => {
    const first = buildBackfillPlan(source);
    const second = buildBackfillPlan(source);

    expect(first).toEqual(second);
    expect(first.workbenches).toBe(1);
    expect(first.workbenchInstances).toBe(1);
    expect(first.buildJobs).toBe(1);
    expect(first.releases).toBe(1);
    expect(first.deployments).toBe(1);
    expect(first.runtimeInstances).toBe(1);
    expect(first.tunnelConnectors).toBe(1);
    expect(first.domainBindings).toBe(1);
    expect(first.deploymentRoutes).toBe(1);
    expect(first.skipped).toEqual([]);
    expect(first.statements.every((statement) => /^(UPSERT|UPDATE)/.test(statement))).toBe(true);
  });

  it("skips orphan records rather than inventing cross-tenant ownership", () => {
    const plan = buildBackfillPlan({
      ...source,
      workspaces: [],
      sandboxes: source.sandboxes,
      deployments: source.deployments,
    });

    expect(plan.workbenchInstances).toBe(0);
    expect(plan.deployments).toBe(0);
    expect(plan.skipped).toHaveLength(4);
    expect(plan.skipped).toEqual(
      expect.arrayContaining([
        expect.stringContaining("no mapped workspace"),
        expect.stringContaining("no mapped workspace deployment"),
      ]),
    );
  });
});
