import { describe, expect, it } from "vite-plus/test";

import type { RuntimeControlConfig } from "../config.ts";
import { DeploymentControlService, type DeploymentKubectl } from "./service.ts";

const config: RuntimeControlConfig = {
  host: "127.0.0.1",
  port: 8787,
  token: "test",
  kubectl: "kubectl",
  namespacePrefix: "nova-runtime",
  runtimeImage: "node:24-alpine",
  runtimeAgentToken: "test",
  secretProvider: "kubernetes",
};

const input = {
  studioId: "studio-one",
  releaseId: "release-one",
  artifact: {
    kind: "static-bundle",
    uri: "https://artifacts.example.test/release-one.tar.gz",
    sha256: "a".repeat(64),
    sizeBytes: 100,
  },
  healthPath: "/health",
};

class FakeKubectl implements DeploymentKubectl {
  manifests: string[] = [];
  deletedNamespaces: string[] = [];

  async applyManifest(manifest: string) {
    this.manifests.push(manifest);
    return { stdout: "applied" };
  }

  async getText() {
    return { stdout: "1" };
  }

  async deleteResource() {
    return { stdout: "deleted" };
  }

  async deleteNamespace(namespace: string) {
    this.deletedNamespaces.push(namespace);
    return { stdout: "deleted" };
  }
}

describe("Deployment reconciliation", () => {
  it("renders an isolated runtime from immutable artifact inputs", () => {
    const service = new DeploymentControlService(config, new FakeKubectl());
    const manifest = service.render("deployment-one", input);
    expect(manifest).toContain("kind: Deployment");
    expect(manifest).toContain("kind: NetworkPolicy");
    expect(manifest).toContain(input.artifact.sha256);
    expect(manifest).toContain(input.artifact.uri);
    expect(manifest).toContain("sha256sum -c -");
    expect(manifest).not.toContain("sourceVolumeKey");
    expect(manifest).not.toContain("kind: PersistentVolumeClaim");
  });

  it("reports healthy only after Kubernetes exposes an available replica", async () => {
    const service = new DeploymentControlService(config, new FakeKubectl());
    await expect(service.verify("deployment-one", input)).resolves.toMatchObject({
      healthy: true,
      availableReplicas: 1,
    });
  });

  it("removes replaceable runtime state without touching Release artifacts", async () => {
    const kubectl = new FakeKubectl();
    const service = new DeploymentControlService(config, kubectl);
    await service.stop("deployment-one", input);
    expect(kubectl.deletedNamespaces).toHaveLength(1);
  });
});
