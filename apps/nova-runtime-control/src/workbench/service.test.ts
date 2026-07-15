import { describe, expect, it } from "vite-plus/test";

import type { RuntimeControlConfig } from "../config.ts";
import { parseDeploymentRoute, parseWorkbenchRoute } from "../http.ts";
import { createWorkbenchComputeManifest, createWorkbenchPersistentManifest } from "./manifests.ts";
import { WorkbenchControlService, type WorkbenchKubectl } from "./service.ts";

const config: RuntimeControlConfig = {
  host: "127.0.0.1",
  port: 8787,
  token: null,
  kubectl: "kubectl",
  namespacePrefix: "nova-runtime",
  runtimeImage: "node:24-alpine",
  runtimeAgentToken: "test-token",
  secretProvider: "kubernetes",
};

const input = {
  namespacePrefix: config.namespacePrefix,
  studioId: "studio:one",
  workbenchId: "workbench:one",
  sourceVolumeKey: "source-one",
  image: config.runtimeImage,
  runtimeAgentToken: config.runtimeAgentToken,
};

describe("Workbench runtime reconciliation", () => {
  it("parses Workbench routes without changing legacy runtime routes", () => {
    expect(parseWorkbenchRoute("/workbenches/workbench%3Aone/resume")).toEqual({
      workbenchId: "workbench:one",
      action: "resume",
    });
    expect(parseWorkbenchRoute("/runtimes/studio-one")).toBeNull();
  });

  it("parses Deployment routes without colliding with Workbenches", () => {
    expect(parseDeploymentRoute("/deployments/deploy%3Aone/verify")).toEqual({
      deploymentId: "deploy:one",
      action: "verify",
    });
    expect(parseDeploymentRoute("/workbenches/one/resume")).toBeNull();
  });

  it("separates durable source from replaceable compute", () => {
    const persistent = createWorkbenchPersistentManifest(input);
    const compute = createWorkbenchComputeManifest(input);

    expect(persistent).toContain("kind: PersistentVolumeClaim");
    expect(persistent).not.toContain("kind: Pod");
    expect(compute).toContain("kind: Pod");
    expect(compute).toContain("claimName: source");
    expect(compute).toContain("runAsNonRoot: true");
    expect(compute).toContain('drop: ["ALL"]');
  });

  it("stops compute resources without deleting the namespace or source claim", async () => {
    const deleted: Array<[string, string, string]> = [];
    const kubectl: WorkbenchKubectl = {
      applyManifest: async () => ({ stdout: "applied" }),
      getText: async () => ({ stdout: "ready" }),
      deleteResource: async (namespace, resource, name) => {
        deleted.push([namespace, resource, name]);
        return { stdout: "deleted" };
      },
    };
    const service = new WorkbenchControlService(config, kubectl);

    const result = await service.stop("workbench:one", {
      studioId: "studio:one",
      sourceVolumeKey: "source-one",
    });

    expect(result.sourcePreserved).toBe(true);
    expect(deleted.map(([, resource]) => resource)).toEqual([
      "service",
      "pod",
      "configmap",
      "secret",
    ]);
    expect(deleted.some(([, resource]) => resource === "persistentvolumeclaim")).toBe(false);
    expect(deleted.some(([, resource]) => resource === "namespace")).toBe(false);
  });
});
