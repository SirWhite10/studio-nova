import type { RuntimeControlConfig } from "../config.ts";
import { Kubectl } from "../kubectl.ts";
import {
  createDeploymentManifest,
  type DeploymentArtifact,
  type DeploymentManifestInput,
} from "./manifests.ts";
import { deploymentResourceNames } from "./names.ts";

export interface DeploymentReconcileInput {
  studioId: string;
  releaseId: string;
  artifact: DeploymentArtifact;
  runtimeImage?: string;
  port?: number;
  healthPath?: string;
}

export interface DeploymentKubectl {
  applyManifest(manifest: string): Promise<{ stdout: string }>;
  getText(resource: string, args?: string[]): Promise<{ stdout: string }>;
  deleteResource(namespace: string, resource: string, name: string): Promise<{ stdout: string }>;
  deleteNamespace(namespace: string): Promise<{ stdout: string }>;
}

export function assertDeployableArtifact(artifact: DeploymentArtifact) {
  if (!artifact || !artifact.kind || !artifact.uri)
    throw new Error("A Release artifact is required");
  if (!/^[a-f0-9]{64}$/.test(artifact.sha256)) throw new Error("Invalid Release artifact SHA-256");
  if (!Number.isSafeInteger(artifact.sizeBytes) || artifact.sizeBytes < 0) {
    throw new Error("Invalid Release artifact size");
  }
  const protocol = new URL(artifact.uri).protocol;
  if (!["http:", "https:"].includes(protocol)) {
    throw new Error(`Habitat cannot fetch ${protocol} artifacts without an artifact resolver`);
  }
}

export class DeploymentControlService {
  private readonly config: RuntimeControlConfig;
  private readonly kubectl: DeploymentKubectl;

  constructor(
    config: RuntimeControlConfig,
    kubectl: DeploymentKubectl = new Kubectl(config.kubectl),
  ) {
    this.config = config;
    this.kubectl = kubectl;
  }

  private manifestInput(
    deploymentId: string,
    input: DeploymentReconcileInput,
  ): DeploymentManifestInput {
    assertDeployableArtifact(input.artifact);
    return {
      namespacePrefix: this.config.namespacePrefix,
      studioId: input.studioId,
      deploymentId,
      releaseId: input.releaseId,
      artifact: input.artifact,
      runtimeImage: input.runtimeImage ?? this.config.runtimeImage,
      port: input.port,
      healthPath: input.healthPath,
    };
  }

  render(deploymentId: string, input: DeploymentReconcileInput) {
    return createDeploymentManifest(this.manifestInput(deploymentId, input));
  }

  async provision(deploymentId: string, input: DeploymentReconcileInput) {
    const names = deploymentResourceNames(
      this.config.namespacePrefix,
      input.studioId,
      deploymentId,
    );
    const output = await this.kubectl.applyManifest(this.render(deploymentId, input));
    const port = input.port ?? 4173;
    return {
      namespace: names.namespace,
      providerInstanceId: `${names.namespace}/${names.deployment}`,
      serviceKey: `${names.service}.${names.namespace}.svc.cluster.local:${port}`,
      healthPath: input.healthPath?.startsWith("/") ? input.healthPath : "/",
      output: output.stdout,
    };
  }

  async verify(deploymentId: string, input: Pick<DeploymentReconcileInput, "studioId" | "port">) {
    const names = deploymentResourceNames(
      this.config.namespacePrefix,
      input.studioId,
      deploymentId,
    );
    const result = await this.kubectl.getText(`deployment/${names.deployment}`, [
      "-n",
      names.namespace,
      "-o",
      "jsonpath={.status.availableReplicas}",
    ]);
    const availableReplicas = Number.parseInt(result.stdout.trim() || "0", 10);
    return {
      namespace: names.namespace,
      healthy: availableReplicas > 0,
      availableReplicas,
      serviceKey: `${names.service}.${names.namespace}.svc.cluster.local:${input.port ?? 4173}`,
    };
  }

  async status(deploymentId: string, input: Pick<DeploymentReconcileInput, "studioId">) {
    const names = deploymentResourceNames(
      this.config.namespacePrefix,
      input.studioId,
      deploymentId,
    );
    const [deployment, service] = await Promise.all([
      this.kubectl.getText(`deployment/${names.deployment}`, ["-n", names.namespace, "-o", "wide"]),
      this.kubectl.getText(`service/${names.service}`, ["-n", names.namespace, "-o", "wide"]),
    ]);
    return { namespace: names.namespace, deployment: deployment.stdout, service: service.stdout };
  }

  async drain(deploymentId: string, input: Pick<DeploymentReconcileInput, "studioId">) {
    const names = deploymentResourceNames(
      this.config.namespacePrefix,
      input.studioId,
      deploymentId,
    );
    const output = await this.kubectl.deleteResource(names.namespace, "service", names.service);
    return { namespace: names.namespace, drained: true, output: output.stdout };
  }

  async stop(deploymentId: string, input: Pick<DeploymentReconcileInput, "studioId">) {
    const names = deploymentResourceNames(
      this.config.namespacePrefix,
      input.studioId,
      deploymentId,
    );
    const output = await this.kubectl.deleteNamespace(names.namespace);
    return { namespace: names.namespace, stopped: true, output: output.stdout };
  }

  rollback(deploymentId: string, input: DeploymentReconcileInput) {
    return this.provision(deploymentId, input);
  }
}
