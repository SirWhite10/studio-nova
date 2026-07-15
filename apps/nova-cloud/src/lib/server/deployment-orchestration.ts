import {
  provisionDeploymentRuntime,
  verifyDeploymentRuntime,
  type DeploymentControlInput,
} from "./nova-runtime-control";
import {
  getDeploymentRuntime,
  markDeploymentFailed,
  markDeploymentRuntimeHealthy,
  registerDeploymentRuntime,
  type DeploymentRow,
} from "./surreal-deployments";
import { listReleaseArtifacts, type ReleaseRow } from "./surreal-releases";
import { findHabitatNode } from "./surreal-workbenches";

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function integer(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

export async function deploymentControlInput(
  deployment: DeploymentRow,
  release: ReleaseRow,
): Promise<DeploymentControlInput> {
  const artifacts = await listReleaseArtifacts(release._id);
  const artifact = artifacts.find(({ uri }) => /^https?:\/\//i.test(uri));
  if (!artifact) {
    throw new Error("Release has no HTTP-fetchable artifact for Habitat");
  }
  return {
    studioId: deployment.studioId,
    releaseId: release._id,
    artifact: {
      kind: artifact.kind,
      uri: artifact.uri,
      sha256: artifact.sha256,
      sizeBytes: artifact.sizeBytes,
    },
    runtimeImage: text(release.manifest.runtimeImage),
    port: integer(release.manifest.port),
    healthPath: text(release.manifest.healthPath),
  };
}

export async function reconcileDeployment(deployment: DeploymentRow, release: ReleaseRow) {
  let current = deployment;
  try {
    const node = await findHabitatNode();
    if (!node || !["online", "degraded"].includes(node.status)) {
      throw new Error("No online Habitat node is registered");
    }
    const input = await deploymentControlInput(deployment, release);
    const provisioned = await provisionDeploymentRuntime(deployment._id, input);
    const registered = await registerDeploymentRuntime({
      deployment: current,
      nodeId: node._id,
      provider: "k3s",
      providerInstanceId: provisioned.result.providerInstanceId,
      serviceKey: provisioned.result.serviceKey,
      healthCheck: {
        path: provisioned.result.healthPath,
        availableReplicas: 0,
        checkedAt: null,
      },
    });
    current = registered.deployment;
    const verified = await verifyDeploymentRuntime(deployment._id, input);
    if (!verified.result.healthy) {
      throw new Error("Deployment Runtime Instance did not pass its health check");
    }
    const healthy = await markDeploymentRuntimeHealthy(current);
    return { ...healthy, control: verified.result };
  } catch (error) {
    await markDeploymentFailed(current, error).catch(() => {});
    throw error;
  }
}

export async function reverifyDeployment(deployment: DeploymentRow, release: ReleaseRow) {
  const runtime = await getDeploymentRuntime(deployment);
  if (!runtime) throw new Error("Deployment has no Runtime Instance");
  const input = await deploymentControlInput(deployment, release);
  const verified = await verifyDeploymentRuntime(deployment._id, input);
  if (!verified.result.healthy) {
    throw new Error("Deployment Runtime Instance is not healthy");
  }
  return markDeploymentRuntimeHealthy(deployment);
}
