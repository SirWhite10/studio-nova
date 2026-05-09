import { describe, expect, test } from "vite-plus/test";
import { buildRouteSpecs, caddyRouteId, mergeWorkspaceRoutes } from "../src/caddy.ts";

describe("caddy route reconciliation", () => {
  test("builds only active enabled workspace routes", () => {
    expect(
      buildRouteSpecs([
        {
          host: "ws-1.dlx.studio",
          localIP: "workspace-1.nova-runtime.svc.cluster.local",
          localPort: 3000,
          enabled: true,
          status: "active",
        },
        {
          host: "customer.example.com",
          localIP: "workspace-1.nova-runtime.svc.cluster.local",
          localPort: 3000,
          enabled: true,
          status: "pending",
        },
      ]),
    ).toEqual([
      {
        host: "ws-1.dlx.studio",
        upstream: "workspace-1.nova-runtime.svc.cluster.local:3000",
      },
    ]);
  });

  test("merges managed routes ahead of fallback routes", () => {
    const config = {
      apps: {
        http: {
          servers: {
            "workspace-edge": {
              routes: [
                {
                  "@id": "nova-fallback",
                  handle: [{ handler: "static_response", status_code: 404 }],
                },
              ],
            },
          },
        },
      },
    };

    const merged = mergeWorkspaceRoutes(config, [
      { host: "ws-1.dlx.studio", upstream: "workspace-1:3000" },
    ]);
    const routes = merged.apps?.http?.servers?.["workspace-edge"]?.routes ?? [];
    expect(routes[0]?.["@id"]).toBe(caddyRouteId("ws-1.dlx.studio"));
    expect(routes[1]?.["@id"]).toBe("nova-fallback");
  });
});
