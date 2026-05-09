import type { RuntimeControlConfig } from "../config.ts";
import { Kubectl } from "../kubectl.ts";
import {
  createRuntimeManifest,
  createSmokeRuntimeManifest,
  normalizeSystemPackages,
} from "./manifests.ts";
import { runtimeNamespace } from "./names.ts";

type AgentResponse = unknown;
type StartRuntimeInput = {
  systemPackages?: string[];
};

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

  renderSmokeRuntime(studioId: string, input: StartRuntimeInput = {}) {
    return createSmokeRuntimeManifest({
      namespacePrefix: this.config.namespacePrefix,
      studioId,
      image: this.config.runtimeImage,
      runtimeAgentToken: this.config.runtimeAgentToken,
      systemPackages: input.systemPackages,
    });
  }

  renderRuntime(studioId: string, input: StartRuntimeInput = {}) {
    return createRuntimeManifest({
      namespacePrefix: this.config.namespacePrefix,
      studioId,
      image: this.config.runtimeImage,
      runtimeAgentToken: this.config.runtimeAgentToken,
      systemPackages: input.systemPackages,
    });
  }

  async startSmokeRuntime(studioId: string, input: StartRuntimeInput = {}) {
    return this.startRuntime(studioId, input);
  }

  async startRuntime(studioId: string, input: StartRuntimeInput = {}) {
    const namespace = runtimeNamespace(this.config.namespacePrefix, studioId);
    const requestedPackages = normalizeSystemPackages(input.systemPackages);
    const currentPackages = await this.currentSystemPackages(namespace);
    if (currentPackages && currentPackages.join("\n") !== requestedPackages.join("\n")) {
      await this.kubectl.deletePod(namespace, "runtime");
    }

    const manifest = this.renderRuntime(studioId, input);
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
    const [pods, pvc, packages] = await Promise.all([
      this.kubectl.getText("pods", ["-n", namespace, "-o", "wide"]),
      this.kubectl.getText("pvc", ["-n", namespace]),
      this.kubectl
        .getText("configmap/runtime-agent", [
          "-n",
          namespace,
          "-o",
          "jsonpath={.data.system-packages\\.txt}",
        ])
        .catch(() => ({ stdout: "", stderr: "", exitCode: 0, command: [] })),
    ]);

    return {
      namespace,
      pods: pods.stdout,
      pvc: pvc.stdout,
      systemPackages: packages.stdout,
    };
  }

  private async currentSystemPackages(namespace: string) {
    try {
      const packages = await this.kubectl.getText("configmap/runtime-agent", [
        "-n",
        namespace,
        "-o",
        "jsonpath={.data.system-packages\\.txt}",
      ]);
      return normalizeSystemPackages(packages.stdout.split(/\r?\n/));
    } catch {
      return null;
    }
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

  async startRuntimePreview(studioId: string, input: unknown) {
    return this.callAgent(studioId, "/preview/start", input);
  }

  async stopRuntimePreview(studioId: string, input: unknown) {
    return this.callAgent(studioId, "/preview/stop", input);
  }
}
