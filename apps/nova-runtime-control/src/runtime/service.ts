import type { RuntimeControlConfig } from "../config.ts";
import { Kubectl } from "../kubectl.ts";
import { createRuntimeManifest, createSmokeRuntimeManifest } from "./manifests.ts";
import { runtimeNamespace } from "./names.ts";

type AgentResponse = unknown;

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
      runtimeAgentToken: this.config.runtimeAgentToken,
    });
  }

  renderRuntime(studioId: string) {
    return createRuntimeManifest({
      namespacePrefix: this.config.namespacePrefix,
      studioId,
      image: this.config.runtimeImage,
      runtimeAgentToken: this.config.runtimeAgentToken,
    });
  }

  async startSmokeRuntime(studioId: string) {
    return this.startRuntime(studioId);
  }

  async startRuntime(studioId: string) {
    const namespace = runtimeNamespace(this.config.namespacePrefix, studioId);
    const manifest = this.renderRuntime(studioId);
    const apply = await this.kubectl.applyManifest(manifest);
    const status = await this.kubectl.getText("pods", ["-n", namespace, "-o", "wide"]);

    return {
      namespace,
      apply: apply.stdout,
      status: status.stdout,
    };
  }

  async deleteSmokeRuntime(studioId: string) {
    return this.deleteRuntime(studioId);
  }

  async deleteRuntime(studioId: string) {
    const namespace = runtimeNamespace(this.config.namespacePrefix, studioId);
    const result = await this.kubectl.deleteNamespace(namespace);

    return {
      namespace,
      output: result.stdout,
    };
  }

  async runtimeStatus(studioId: string) {
    const namespace = runtimeNamespace(this.config.namespacePrefix, studioId);
    const [pods, pvc] = await Promise.all([
      this.kubectl.getText("pods", ["-n", namespace, "-o", "wide"]),
      this.kubectl.getText("pvc", ["-n", namespace]),
    ]);

    return {
      namespace,
      pods: pods.stdout,
      pvc: pvc.stdout,
    };
  }

  private async callAgent(
    studioId: string,
    path: string,
    input: unknown = {},
  ): Promise<AgentResponse> {
    const namespace = runtimeNamespace(this.config.namespacePrefix, studioId);
    const payload = Buffer.from(JSON.stringify(input), "utf8").toString("base64");
    const script = `
const payload = JSON.parse(Buffer.from(process.env.NOVA_AGENT_PAYLOAD || "e30=", "base64").toString("utf8"));
const response = await fetch("http://127.0.0.1:8788${path}", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: "Bearer " + process.env.NOVA_RUNTIME_AGENT_TOKEN,
  },
  body: JSON.stringify(payload),
});
const text = await response.text();
process.stdout.write(text);
if (!response.ok) process.exit(1);
`;
    const result = await this.kubectl.exec(namespace, "runtime", [
      "env",
      `NOVA_AGENT_PAYLOAD=${payload}`,
      `NOVA_RUNTIME_AGENT_TOKEN=${this.config.runtimeAgentToken}`,
      "node",
      "--input-type=module",
      "-e",
      script,
    ]);
    return JSON.parse(result.stdout) as AgentResponse;
  }

  async execRuntime(studioId: string, input: unknown) {
    return this.callAgent(studioId, "/exec", input);
  }

  async readRuntimeFile(studioId: string, input: unknown) {
    return this.callAgent(studioId, "/files/read", input);
  }

  async writeRuntimeFile(studioId: string, input: unknown) {
    return this.callAgent(studioId, "/files/write", input);
  }

  async listRuntimeFiles(studioId: string, input: unknown) {
    return this.callAgent(studioId, "/files/list", input);
  }

  async deleteRuntimeFile(studioId: string, input: unknown) {
    return this.callAgent(studioId, "/files/delete", input);
  }
}
