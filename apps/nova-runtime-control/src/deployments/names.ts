import { sanitizeKubernetesName } from "../runtime/names.ts";

export interface DeploymentResourceNames {
  namespace: string;
  deployment: "release-runtime";
  service: "release-service";
  releaseConfig: "release-config";
  serviceAccount: "release-runtime";
}

export function deploymentNamespace(
  namespacePrefix: string,
  studioId: string,
  deploymentId: string,
) {
  const studio = sanitizeKubernetesName(studioId).slice(0, 20);
  const deployment = sanitizeKubernetesName(deploymentId).slice(0, 24);
  return `${sanitizeKubernetesName(namespacePrefix)}-dep-${studio}-${deployment}`.slice(0, 63);
}

export function deploymentResourceNames(
  namespacePrefix: string,
  studioId: string,
  deploymentId: string,
): DeploymentResourceNames {
  return {
    namespace: deploymentNamespace(namespacePrefix, studioId, deploymentId),
    deployment: "release-runtime",
    service: "release-service",
    releaseConfig: "release-config",
    serviceAccount: "release-runtime",
  };
}
