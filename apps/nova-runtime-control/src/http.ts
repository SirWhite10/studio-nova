import type { IncomingMessage, ServerResponse } from "node:http";

export function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(body, null, 2)}\n`);
}

export function sendText(response: ServerResponse, status: number, body: string) {
  response.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
  });
  response.end(body);
}

export async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return null;
  return JSON.parse(raw);
}

export function requireBearerToken(
  request: IncomingMessage,
  configuredToken: string | null,
): boolean {
  if (!configuredToken) return true;
  const authorization = request.headers.authorization ?? "";
  return authorization === `Bearer ${configuredToken}`;
}

export type WorkbenchRoute = {
  workbenchId: string;
  action: "status" | "allocate" | "resume" | "stop";
};

export function parseWorkbenchRoute(pathname: string): WorkbenchRoute | null {
  const match = pathname.match(/^\/workbenches\/([^/]+)(?:\/(status|allocate|resume|stop))?$/);
  if (!match?.[1]) return null;
  return {
    workbenchId: decodeURIComponent(match[1]),
    action: (match[2] as WorkbenchRoute["action"] | undefined) ?? "status",
  };
}

export type DeploymentRoute = {
  deploymentId: string;
  action: "status" | "provision" | "verify" | "drain" | "stop" | "rollback";
};

export function parseDeploymentRoute(pathname: string): DeploymentRoute | null {
  const match = pathname.match(
    /^\/deployments\/([^/]+)(?:\/(status|provision|verify|drain|stop|rollback))?$/,
  );
  if (!match?.[1]) return null;
  return {
    deploymentId: decodeURIComponent(match[1]),
    action: (match[2] as DeploymentRoute["action"] | undefined) ?? "status",
  };
}
