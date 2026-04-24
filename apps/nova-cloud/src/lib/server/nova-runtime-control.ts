type RuntimeControlAction =
  | { action: "delete" | "status" }
  | { action: "start"; systemPackages?: string[] }
  | { action: "exec"; command: string; timeoutMs?: number };

const DEFAULT_RUNTIME_CONTROL_URL = "http://127.0.0.1:8787";

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
