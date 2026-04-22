import type { RuntimeControlConfig } from "../config.ts";
import { Kubectl } from "../kubectl.ts";
import { createSmokeRuntimeManifest } from "./manifests.ts";
import { runtimeNamespace } from "./names.ts";

export class RuntimeControlService {
  private readonly kubectl: Kubectl;
  private readonly config: RuntimeControlConfig;

  constructor(config: RuntimeControlConfig) {
    this.config = config;
    this.kubectl = new Kubectl(config.kubectl);
  }

  async clusterSummary() {
    const [nodes, pods, storageClasses] = await Promise.all([
      this.kubectl.getText("nodes", ["-o", "wide"]),
      this.kubectl.getText("pods", ["-A", "-o", "wide"]),
      this.kubectl.getText("storageclass"),
    ]);

    return {
      nodes: nodes.stdout,
      pods: pods.stdout,
      storageClasses: storageClasses.stdout,
    };
  }

  renderSmokeRuntime(studioId: string) {
    return createSmokeRuntimeManifest({
      namespacePrefix: this.config.namespacePrefix,
      studioId,
      image: this.config.runtimeImage,
    });
  }

  async startSmokeRuntime(studioId: string) {
    const namespace = runtimeNamespace(this.config.namespacePrefix, studioId);
    const manifest = this.renderSmokeRuntime(studioId);
    const apply = await this.kubectl.applyManifest(manifest);
    const status = await this.kubectl.getText("pods", ["-n", namespace, "-o", "wide"]);

    return {
      namespace,
      apply: apply.stdout,
      status: status.stdout,
    };
  }

  async deleteSmokeRuntime(studioId: string) {
    const namespace = runtimeNamespace(this.config.namespacePrefix, studioId);
    const result = await this.kubectl.deleteNamespace(namespace);

    return {
      namespace,
      output: result.stdout,
    };
  }
}
