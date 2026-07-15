import type { RuntimeControlConfig } from "../config.ts";
import { Kubectl } from "../kubectl.ts";
import { createWorkbenchComputeManifest, createWorkbenchPersistentManifest } from "./manifests.ts";
import { workbenchResourceNames } from "./names.ts";

export interface WorkbenchReconcileInput {
  studioId: string;
  sourceVolumeKey: string;
  systemPackages?: string[];
}

export interface WorkbenchKubectl {
  applyManifest(manifest: string): Promise<{ stdout: string }>;
  getText(resource: string, args?: string[]): Promise<{ stdout: string }>;
  deleteResource(namespace: string, resource: string, name: string): Promise<{ stdout: string }>;
}

export class WorkbenchControlService {
  private readonly kubectl: WorkbenchKubectl;
  private readonly config: RuntimeControlConfig;

  constructor(
    config: RuntimeControlConfig,
    kubectl: WorkbenchKubectl = new Kubectl(config.kubectl),
  ) {
    this.config = config;
    this.kubectl = kubectl;
  }

  private manifestInput(workbenchId: string, input: WorkbenchReconcileInput) {
    return {
      namespacePrefix: this.config.namespacePrefix,
      studioId: input.studioId,
      workbenchId,
      sourceVolumeKey: input.sourceVolumeKey,
      image: this.config.runtimeImage,
      runtimeAgentToken: this.config.runtimeAgentToken,
      systemPackages: input.systemPackages,
    };
  }

  render(workbenchId: string, input: WorkbenchReconcileInput) {
    const manifestInput = this.manifestInput(workbenchId, input);
    return {
      persistent: createWorkbenchPersistentManifest(manifestInput),
      compute: createWorkbenchComputeManifest(manifestInput),
    };
  }

  async allocate(workbenchId: string, input: WorkbenchReconcileInput) {
    const names = workbenchResourceNames(this.config.namespacePrefix, input.studioId, workbenchId);
    const manifests = this.render(workbenchId, input);
    const persistent = await this.kubectl.applyManifest(manifests.persistent);
    const compute = await this.kubectl.applyManifest(manifests.compute);
    return {
      namespace: names.namespace,
      providerInstanceId: `${names.namespace}/${names.pod}`,
      sourceVolumeKey: input.sourceVolumeKey,
      persistent: persistent.stdout,
      compute: compute.stdout,
      previewEndpoint: `${names.service}.${names.namespace}.svc.cluster.local:4173`,
    };
  }

  resume(workbenchId: string, input: WorkbenchReconcileInput) {
    return this.allocate(workbenchId, input);
  }

  async stop(workbenchId: string, input: WorkbenchReconcileInput) {
    const names = workbenchResourceNames(this.config.namespacePrefix, input.studioId, workbenchId);
    const deleted = await Promise.all([
      this.kubectl.deleteResource(names.namespace, "service", names.service),
      this.kubectl.deleteResource(names.namespace, "pod", names.pod),
      this.kubectl.deleteResource(names.namespace, "configmap", names.agentConfig),
      this.kubectl.deleteResource(names.namespace, "secret", names.agentSecret),
    ]);
    return {
      namespace: names.namespace,
      sourceVolumeKey: input.sourceVolumeKey,
      sourcePreserved: true,
      output: deleted.map(({ stdout }) => stdout).join("\n"),
    };
  }

  async status(workbenchId: string, input: WorkbenchReconcileInput) {
    const names = workbenchResourceNames(this.config.namespacePrefix, input.studioId, workbenchId);
    const [pod, source] = await Promise.all([
      this.kubectl.getText(`pod/${names.pod}`, ["-n", names.namespace, "-o", "wide"]),
      this.kubectl.getText(`pvc/${names.sourceClaim}`, ["-n", names.namespace]),
    ]);
    return {
      namespace: names.namespace,
      pod: pod.stdout,
      source: source.stdout,
      sourceVolumeKey: input.sourceVolumeKey,
    };
  }
}
