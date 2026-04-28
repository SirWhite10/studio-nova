import type { IncomingMessage } from "node:http";
import type { DomainStore } from "./store.ts";
import type { FrpPluginResponse } from "./types.ts";

function allow(content?: unknown): FrpPluginResponse {
  return { reject: false, unchange: true, content };
}

function reject(reason: string): FrpPluginResponse {
  return { reject: true, rejectReason: reason };
}

function readMetadata(payload: Record<string, unknown>, key: string) {
  const metas = payload.metas;
  if (metas && typeof metas === "object" && key in metas) {
    const value = (metas as Record<string, unknown>)[key];
    return typeof value === "string" ? value : null;
  }
  const user = payload.user;
  if (user && typeof user === "object") {
    const userMetas = (user as Record<string, unknown>).metas;
    if (userMetas && typeof userMetas === "object" && key in userMetas) {
      const value = (userMetas as Record<string, unknown>)[key];
      return typeof value === "string" ? value : null;
    }
  }
  return null;
}

function unwrapPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return {};
  const value = payload as Record<string, unknown>;
  const content = value.content;
  return content && typeof content === "object" ? (content as Record<string, unknown>) : value;
}

export async function handleFrpPluginRequest(input: {
  request: IncomingMessage;
  op: string;
  payload: unknown;
  store: DomainStore;
  frpToken: string | null;
}): Promise<FrpPluginResponse> {
  const payload = unwrapPayload(input.payload);

  if (input.frpToken) {
    const metadataToken = readMetadata(payload, "token");
    const headerToken = input.request.headers["x-nova-frp-token"];
    if (metadataToken !== input.frpToken && headerToken !== input.frpToken) {
      return reject("Unauthorized frp plugin request");
    }
  }

  if (input.op === "Login" || input.op === "Ping" || input.op === "CloseProxy") {
    return allow();
  }

  if (input.op === "NewProxy") {
    const proxyName = typeof payload.proxy_name === "string" ? payload.proxy_name : null;
    if (!proxyName) return reject("Missing proxy_name");

    const proxy = await input.store.getProxyByName(proxyName);
    if (!proxy) return reject(`Proxy is not registered: ${proxyName}`);
    if (!proxy.enabled) return reject(`Proxy is disabled: ${proxyName}`);

    return allow();
  }

  if (input.op === "NewUserConn") {
    return allow();
  }

  return reject(`Unsupported frp plugin op: ${input.op}`);
}
