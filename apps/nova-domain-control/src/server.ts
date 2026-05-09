import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { DomainControlConfig } from "./config.ts";
import { buildRouteSpecs, CaddyAdminClient } from "./caddy.ts";
import { classifyHost, validateHost } from "./domain.ts";
import { handleFrpPluginRequest } from "./frp-plugin.ts";
import { readJson, requireBearerToken, sendJson } from "./http.ts";
import type { DomainStore } from "./store.ts";
import type { ProxyUpsertInput } from "./types.ts";
import { verifyDomainToken } from "./verification.ts";

function routeProxy(pathname: string) {
  const match = pathname.match(/^\/admin\/proxies\/([^/]+)(?:\/sync-caddy)?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function routeStudioDomains(pathname: string) {
  const match = pathname.match(/^\/admin\/studios\/([^/]+)\/domains$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function routeDomain(pathname: string) {
  const match = pathname.match(/^\/admin\/domains\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function parseProxyInput(input: unknown): ProxyUpsertInput {
  if (!input || typeof input !== "object") throw new Error("Body must be an object");
  const value = input as Record<string, unknown>;
  for (const key of ["userId", "studioId", "proxyName", "localPort"]) {
    if (!(key in value)) throw new Error(`Missing required field: ${key}`);
  }

  if (typeof value.userId !== "string") throw new Error("userId must be a string");
  if (typeof value.studioId !== "string") throw new Error("studioId must be a string");
  if (typeof value.proxyName !== "string") throw new Error("proxyName must be a string");
  if (typeof value.localPort !== "number") throw new Error("localPort must be a number");

  return {
    userId: value.userId,
    studioId: value.studioId,
    runtimeId: typeof value.runtimeId === "string" ? value.runtimeId : undefined,
    proxyName: value.proxyName,
    proxyType:
      value.proxyType === "https" ||
      value.proxyType === "tcp" ||
      value.proxyType === "udp" ||
      value.proxyType === "http"
        ? value.proxyType
        : "http",
    localIP: typeof value.localIP === "string" ? value.localIP : undefined,
    localPort: value.localPort,
    remotePort: typeof value.remotePort === "number" ? value.remotePort : undefined,
    frpcClientId: typeof value.frpcClientId === "string" ? value.frpcClientId : undefined,
    enabled: typeof value.enabled === "boolean" ? value.enabled : undefined,
    subdomain: typeof value.subdomain === "string" ? value.subdomain : undefined,
    customDomains: Array.isArray(value.customDomains)
      ? value.customDomains.filter((domain): domain is string => typeof domain === "string")
      : undefined,
  };
}

function parseHostBody(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Body must be an object");
  const host = (input as Record<string, unknown>).host;
  if (typeof host !== "string") throw new Error("host must be a string");
  return host;
}

export function createDomainControlServer(config: DomainControlConfig, store: DomainStore) {
  const caddy = config.caddyAdminUrl ? new CaddyAdminClient(config.caddyAdminUrl) : null;
  return createServer(async (request: IncomingMessage, response: ServerResponse) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, {
          ok: true,
          service: "nova-domain-control",
          store: await store.health(),
          subdomainHost: config.subdomainHost,
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/resolve") {
        const host = url.searchParams.get("host") ?? "";
        const safeHost = validateHost(host);
        if (!safeHost.ok) {
          sendJson(response, 400, { ok: false, error: safeHost.error });
          return;
        }

        const result = await store.resolveHost(safeHost.host);
        sendJson(response, result ? 200 : 404, {
          ok: Boolean(result),
          host: safeHost.host,
          kind: classifyHost(safeHost.host, config.subdomainHost),
          result,
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/admin/domains/verify") {
        if (!requireBearerToken(request, config.token)) {
          sendJson(response, 401, { ok: false, error: "Unauthorized" });
          return;
        }

        const host = url.searchParams.get("host") ?? "";
        const safeHost = validateHost(host);
        if (!safeHost.ok) {
          sendJson(response, 400, { ok: false, error: safeHost.error });
          return;
        }

        const result = await store.getDomainByHost(safeHost.host);
        if (!result) {
          sendJson(response, 404, { ok: false, error: "Domain not found" });
          return;
        }
        if (result.domain.kind !== "custom") {
          sendJson(response, 400, {
            ok: false,
            error: "Only custom domains require TXT verification",
          });
          return;
        }
        if (!result.domain.verificationToken) {
          sendJson(response, 500, { ok: false, error: "Domain is missing a verification token" });
          return;
        }

        const verification = await verifyDomainToken(
          result.domain.host,
          result.domain.verificationToken,
          config.verificationPrefix,
        );
        sendJson(response, 200, {
          ok: true,
          host: result.domain.host,
          status: result.domain.status,
          verification,
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/admin/domains/verify") {
        if (!requireBearerToken(request, config.token)) {
          sendJson(response, 401, { ok: false, error: "Unauthorized" });
          return;
        }

        const host = parseHostBody(await readJson(request));
        const safeHost = validateHost(host);
        if (!safeHost.ok) {
          sendJson(response, 400, { ok: false, error: safeHost.error });
          return;
        }

        const result = await store.getDomainByHost(safeHost.host);
        if (!result) {
          sendJson(response, 404, { ok: false, error: "Domain not found" });
          return;
        }
        if (result.domain.kind !== "custom") {
          sendJson(response, 400, {
            ok: false,
            error: "Only custom domains require TXT verification",
          });
          return;
        }
        if (!result.domain.verificationToken) {
          sendJson(response, 500, { ok: false, error: "Domain is missing a verification token" });
          return;
        }

        const verification = await verifyDomainToken(
          result.domain.host,
          result.domain.verificationToken,
          config.verificationPrefix,
        );
        if (!verification.verified) {
          sendJson(response, 200, {
            ok: true,
            host: result.domain.host,
            activated: false,
            status: result.domain.status,
            verification,
          });
          return;
        }

        await store.setDomainStatus(result.domain.host, "verified");
        if (caddy) {
          const rows = await store.listProxyDomains(result.proxy.proxyName);
          const specs = buildRouteSpecs(
            rows.map((row) => ({
              host: row.domain.host,
              localIP: row.proxy.localIP,
              localPort: row.proxy.localPort,
              enabled: row.proxy.enabled,
              status: row.domain.host === result.domain.host ? "active" : row.domain.status,
            })),
          );
          await caddy.syncWorkspaceRoutes(specs);
        }
        const activated = await store.setDomainStatus(result.domain.host, "active");
        sendJson(response, 200, {
          ok: true,
          host: result.domain.host,
          activated: true,
          status: activated?.domain.status ?? "active",
          verification,
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/admin/proxies") {
        if (!requireBearerToken(request, config.token)) {
          sendJson(response, 401, { ok: false, error: "Unauthorized" });
          return;
        }

        const input = parseProxyInput(await readJson(request));
        const result = await store.upsertProxy(input, config.subdomainHost);
        sendJson(response, 200, { ok: true, result });
        return;
      }

      const studioId = routeStudioDomains(url.pathname);
      if (studioId && request.method === "GET") {
        if (!requireBearerToken(request, config.token)) {
          sendJson(response, 401, { ok: false, error: "Unauthorized" });
          return;
        }
        const result = await store.listDomainsForStudio(studioId);
        sendJson(response, 200, { ok: true, studioId, result });
        return;
      }

      const proxyName = routeProxy(url.pathname);
      if (proxyName && request.method === "POST" && url.pathname.endsWith("/sync-caddy")) {
        if (!requireBearerToken(request, config.token)) {
          sendJson(response, 401, { ok: false, error: "Unauthorized" });
          return;
        }
        if (!caddy) {
          sendJson(response, 501, {
            ok: false,
            error: "Caddy admin integration is not configured",
          });
          return;
        }

        const rows = await store.listProxyDomains(proxyName);
        const specs = buildRouteSpecs(
          rows.map((row) => ({
            host: row.domain.host,
            localIP: row.proxy.localIP,
            localPort: row.proxy.localPort,
            enabled: row.proxy.enabled,
            status: row.domain.status,
          })),
        );
        const result = await caddy.syncWorkspaceRoutes(specs);
        sendJson(response, 200, { ok: true, proxyName, result });
        return;
      }

      if (proxyName && request.method === "DELETE") {
        if (!requireBearerToken(request, config.token)) {
          sendJson(response, 401, { ok: false, error: "Unauthorized" });
          return;
        }

        await store.disableProxy(proxyName);
        sendJson(response, 200, { ok: true });
        return;
      }

      const domainHost = routeDomain(url.pathname);
      if (domainHost && request.method === "DELETE") {
        if (!requireBearerToken(request, config.token)) {
          sendJson(response, 401, { ok: false, error: "Unauthorized" });
          return;
        }
        const deleted = await store.removeDomain(
          domainHost,
          url.searchParams.get("studioId") ?? undefined,
        );
        sendJson(response, deleted ? 200 : 404, { ok: deleted, host: domainHost });
        return;
      }

      if (request.method === "POST" && url.pathname === "/frp/handler") {
        const op = url.searchParams.get("op") ?? "";
        const payload = await readJson(request);
        const result = await handleFrpPluginRequest({
          request,
          op,
          payload,
          store,
          frpToken: config.frpToken,
        });
        sendJson(response, 200, result);
        return;
      }

      sendJson(response, 404, { ok: false, error: "Not found" });
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
