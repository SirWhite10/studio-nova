import { sanitizeKubernetesName } from "../runtime/names.ts";

export interface WorkbenchResourceNames {
  namespace: string;
  pod: "workbench";
  service: "workbench-preview";
  sourceClaim: "source";
  agentConfig: "workbench-agent";
  agentSecret: "workbench-agent-token";
}

export function workbenchNamespace(
  namespacePrefix: string,
  studioId: string,
  workbenchId: string,
): string {
  const studio = sanitizeKubernetesName(studioId).slice(0, 20);
  const workbench = sanitizeKubernetesName(workbenchId).slice(0, 24);
  return `${sanitizeKubernetesName(namespacePrefix)}-wb-${studio}-${workbench}`.slice(0, 63);
}

export function workbenchResourceNames(
  namespacePrefix: string,
  studioId: string,
  workbenchId: string,
): WorkbenchResourceNames {
  return {
    namespace: workbenchNamespace(namespacePrefix, studioId, workbenchId),
    pod: "workbench",
    service: "workbench-preview",
    sourceClaim: "source",
    agentConfig: "workbench-agent",
    agentSecret: "workbench-agent-token",
  };
}
