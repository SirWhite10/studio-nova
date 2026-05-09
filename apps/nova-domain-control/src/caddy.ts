import type { CaddyRouteSpec } from "./types.ts";

type CaddyConfig = {
  apps?: {
    http?: {
      servers?: Record<string, { routes?: Array<Record<string, unknown>> }>;
    };
  };
};

const MANAGED_ROUTE_PREFIX = "nova-route-";
const DEFAULT_SERVER_NAME = "workspace-edge";

export function caddyRouteId(host: string) {
  return `${MANAGED_ROUTE_PREFIX}${host.replace(/[^a-z0-9-]/g, "-")}`;
}

function buildRoute(spec: CaddyRouteSpec) {
  return {
    "@id": caddyRouteId(spec.host),
    match: [{ host: [spec.host] }],
    handle: [
      {
        handler: "reverse_proxy",
        upstreams: [{ dial: spec.upstream }],
      },
    ],
    terminal: true,
  };
}

export function mergeWorkspaceRoutes(
  config: CaddyConfig,
  specs: CaddyRouteSpec[],
  serverName = DEFAULT_SERVER_NAME,
): CaddyConfig {
  const nextConfig = structuredClone(config);
  const apps = (nextConfig.apps ??= {});
  const http = (apps.http ??= {});
  const servers = (http.servers ??= {});
  const server = (servers[serverName] ??= {});
  const routes = (server.routes ??= []);

  const desiredIds = new Set(specs.map((spec) => caddyRouteId(spec.host)));
  const unmanaged = routes.filter((route) => {
    const routeId = typeof route["@id"] === "string" ? route["@id"] : null;
    return !routeId?.startsWith(MANAGED_ROUTE_PREFIX) || desiredIds.has(routeId);
  });

  const withoutManaged = unmanaged.filter((route) => {
    const routeId = typeof route["@id"] === "string" ? route["@id"] : null;
    return !routeId?.startsWith(MANAGED_ROUTE_PREFIX);
  });

  server.routes = [...specs.map(buildRoute), ...withoutManaged];
  return nextConfig;
}

export function buildRouteSpecs(
  input: Array<{
    host: string;
    localIP: string;
    localPort: number;
    enabled: boolean;
    status: string;
  }>,
): CaddyRouteSpec[] {
  return input
    .filter((value) => value.enabled && value.status === "active")
    .map((value) => ({
      host: value.host,
      upstream: `${value.localIP}:${value.localPort}`,
    }));
}

export class CaddyAdminClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async syncWorkspaceRoutes(specs: CaddyRouteSpec[]) {
    const current = await this.fetchConfig();
    const next = mergeWorkspaceRoutes(current, specs);
    const response = await fetch(new URL("/load", this.baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!response.ok) {
      throw new Error(`Failed to load Caddy config: HTTP ${response.status}`);
    }
    return {
      ok: true as const,
      count: specs.length,
      hosts: specs.map((spec) => spec.host),
    };
  }

  private async fetchConfig(): Promise<CaddyConfig> {
    const response = await fetch(new URL("/config/", this.baseUrl));
    if (!response.ok) {
      throw new Error(`Failed to fetch Caddy config: HTTP ${response.status}`);
    }
    return (await response.json()) as CaddyConfig;
  }
}
