type RuntimeControlAction =
  | { action: "delete" | "status" }
  | { action: "start"; systemPackages?: string[] }
  | { action: "exec"; command: string; timeoutMs?: number };

const DEFAULT_RUNTIME_CONTROL_URL = "http://127.0.0.1:8787";
const DEFAULT_RUNTIME_NAMESPACE_PREFIX = "nova-runtime";
const DEFAULT_RUNTIME_PREVIEW_SERVICE = "runtime-preview";

export function runtimeControlConfigured() {
  return Boolean(process.env.NOVA_RUNTIME_CONTROL_URL || process.env.NOVA_RUNTIME_CONTROL_TOKEN);
}

function runtimeControlUrl(path: string) {
  const baseUrl = process.env.NOVA_RUNTIME_CONTROL_URL || DEFAULT_RUNTIME_CONTROL_URL;
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
}

function runtimeControlHeaders() {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const token = process.env.NOVA_RUNTIME_CONTROL_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

async function parseRuntimeControlResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { output: await response.text() };

  if (!response.ok) {
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `Runtime control request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export function runtimeControlStudioId(userId: string, studioId: string) {
  return `nova-cloud-${userId}-${studioId}`;
}

export function sanitizeRuntimeName(input: string) {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized.slice(0, 48) || "studio";
}

export function runtimeControlNamespace(controlStudioId: string) {
  const prefix = process.env.NOVA_RUNTIME_NAMESPACE_PREFIX || DEFAULT_RUNTIME_NAMESPACE_PREFIX;
  return `${prefix}-${sanitizeRuntimeName(controlStudioId)}`.slice(0, 63);
}

export function runtimePreviewServiceHost(controlStudioId: string, port = 4173) {
  const namespace = runtimeControlNamespace(controlStudioId);
  return `${DEFAULT_RUNTIME_PREVIEW_SERVICE}.${namespace}.svc.cluster.local:${port}`;
}

export async function getRuntimeControlHealth() {
  const response = await fetch(runtimeControlUrl("/health"));
  return parseRuntimeControlResponse(response);
}

export async function getRuntimeControlStatus(controlStudioId: string) {
  const response = await fetch(
    runtimeControlUrl(`/runtimes/${encodeURIComponent(controlStudioId)}`),
  );
  return parseRuntimeControlResponse(response);
}

export async function callRuntimeControl(controlStudioId: string, input: RuntimeControlAction) {
  if (input.action === "status") return getRuntimeControlStatus(controlStudioId);

  if (input.action === "delete") {
    const response = await fetch(
      runtimeControlUrl(`/runtimes/${encodeURIComponent(controlStudioId)}`),
      {
        method: "DELETE",
        headers: runtimeControlHeaders(),
      },
    );
    return parseRuntimeControlResponse(response);
  }

  if (input.action === "start") {
    const response = await fetch(
      runtimeControlUrl(`/runtimes/${encodeURIComponent(controlStudioId)}`),
      {
        method: "POST",
        headers: runtimeControlHeaders(),
        body: JSON.stringify({ systemPackages: input.systemPackages ?? [] }),
      },
    );
    return parseRuntimeControlResponse(response);
  }

  if (input.action === "exec") {
    const response = await fetch(
      runtimeControlUrl(`/runtimes/${encodeURIComponent(controlStudioId)}/exec`),
      {
        method: "POST",
        headers: runtimeControlHeaders(),
        body: JSON.stringify({
          command: input.command,
          timeoutMs: input.timeoutMs ?? 30_000,
        }),
      },
    );
    return parseRuntimeControlResponse(response);
  }

  throw new Error(`Unsupported runtime control action: ${(input as { action: string }).action}`);
}

async function postRuntimeControl<T>(controlStudioId: string, path: string, input: unknown) {
  const response = await fetch(
    runtimeControlUrl(`/runtimes/${encodeURIComponent(controlStudioId)}${path}`),
    {
      method: "POST",
      headers: runtimeControlHeaders(),
      body: JSON.stringify(input ?? {}),
    },
  );
  return (await parseRuntimeControlResponse(response)) as T;
}

export async function execRuntimeControl(
  controlStudioId: string,
  input: { command: string; timeoutMs?: number; cwd?: string },
) {
  return postRuntimeControl<{
    ok: true;
    result: { success: boolean; result?: any; error?: string };
  }>(controlStudioId, "/exec", input);
}

export async function readRuntimeControlFile(controlStudioId: string, path: string) {
  return postRuntimeControl<{
    ok: true;
    result: { success: boolean; result?: { content: string } };
  }>(controlStudioId, "/files/read", { path });
}

export async function writeRuntimeControlFile(
  controlStudioId: string,
  input: { path: string; content: string },
) {
  return postRuntimeControl(controlStudioId, "/files/write", input);
}

export async function listRuntimeControlFiles(controlStudioId: string, path: string) {
  return postRuntimeControl<{
    ok: true;
    result: { success: boolean; result?: { entries: Array<{ name: string; type: string }> } };
  }>(controlStudioId, "/files/list", { path });
}

export async function deleteRuntimeControlFile(controlStudioId: string, path: string) {
  return postRuntimeControl(controlStudioId, "/files/delete", { path });
}

export async function startRuntimeControlPreview(
  controlStudioId: string,
  input: { rootPath: string; port?: number },
) {
  return postRuntimeControl<{
    ok: true;
    result: { success: boolean; result?: { port: number; rootPath: string } };
  }>(controlStudioId, "/preview/start", input);
}

export async function stopRuntimeControlPreview(controlStudioId: string, input: { port?: number }) {
  return postRuntimeControl<{
    ok: true;
    result: { success: boolean; result?: { port: number; stopped: boolean } };
  }>(controlStudioId, "/preview/stop", input);
}

export type WorkbenchControlInput = {
  studioId: string;
  sourceVolumeKey: string;
  systemPackages?: string[];
};

async function callWorkbenchControl(
  workbenchId: string,
  action: "allocate" | "resume" | "stop",
  input: WorkbenchControlInput,
) {
  const response = await fetch(
    runtimeControlUrl(
      `/workbenches/${encodeURIComponent(workbenchId)}/${encodeURIComponent(action)}`,
    ),
    {
      method: "POST",
      headers: runtimeControlHeaders(),
      body: JSON.stringify(input),
    },
  );
  return (await parseRuntimeControlResponse(response)) as {
    ok: true;
    result: {
      namespace: string;
      providerInstanceId?: string;
      sourceVolumeKey: string;
      sourcePreserved?: boolean;
      previewEndpoint?: string;
    };
  };
}

export function allocateWorkbenchRuntime(workbenchId: string, input: WorkbenchControlInput) {
  return callWorkbenchControl(workbenchId, "allocate", input);
}

export function resumeWorkbenchRuntime(workbenchId: string, input: WorkbenchControlInput) {
  return callWorkbenchControl(workbenchId, "resume", input);
}

export function stopWorkbenchRuntime(workbenchId: string, input: WorkbenchControlInput) {
  return callWorkbenchControl(workbenchId, "stop", input);
}

export type DeploymentControlInput = {
  studioId: string;
  releaseId: string;
  artifact: {
    kind: string;
    uri: string;
    sha256: string;
    sizeBytes: number;
  };
  runtimeImage?: string;
  port?: number;
  healthPath?: string;
};

async function callDeploymentControl<T>(
  deploymentId: string,
  action: "provision" | "verify" | "drain" | "stop" | "rollback",
  input: DeploymentControlInput,
) {
  const response = await fetch(
    runtimeControlUrl(
      `/deployments/${encodeURIComponent(deploymentId)}/${encodeURIComponent(action)}`,
    ),
    {
      method: "POST",
      headers: runtimeControlHeaders(),
      body: JSON.stringify(input),
    },
  );
  return (await parseRuntimeControlResponse(response)) as { ok: true; result: T };
}

export function provisionDeploymentRuntime(deploymentId: string, input: DeploymentControlInput) {
  return callDeploymentControl<{
    namespace: string;
    providerInstanceId: string;
    serviceKey: string;
    healthPath: string;
  }>(deploymentId, "provision", input);
}

export function verifyDeploymentRuntime(deploymentId: string, input: DeploymentControlInput) {
  return callDeploymentControl<{
    namespace: string;
    healthy: boolean;
    availableReplicas: number;
    serviceKey: string;
  }>(deploymentId, "verify", input);
}

export function drainDeploymentRuntime(deploymentId: string, input: DeploymentControlInput) {
  return callDeploymentControl(deploymentId, "drain", input);
}

export function stopDeploymentRuntime(deploymentId: string, input: DeploymentControlInput) {
  return callDeploymentControl(deploymentId, "stop", input);
}
