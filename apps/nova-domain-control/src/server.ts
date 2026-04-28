import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { DomainControlConfig } from "./config.ts";
import { classifyHost, validateHost } from "./domain.ts";
import { handleFrpPluginRequest } from "./frp-plugin.ts";
import { readJson, requireBearerToken, sendJson } from "./http.ts";
import type { DomainStore } from "./store.ts";
import type { ProxyUpsertInput } from "./types.ts";

function routeProxy(pathname: string) {
  const match = pathname.match(/^\/admin\/proxies\/([^/]+)$/);
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

export function createDomainControlServer(config: DomainControlConfig, store: DomainStore) {
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

      const proxyName = routeProxy(url.pathname);
      if (proxyName && request.method === "DELETE") {
        if (!requireBearerToken(request, config.token)) {
          sendJson(response, 401, { ok: false, error: "Unauthorized" });
          return;
        }

        await store.disableProxy(proxyName);
        sendJson(response, 200, { ok: true });
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
