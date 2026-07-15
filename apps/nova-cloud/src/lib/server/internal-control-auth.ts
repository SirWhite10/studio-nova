import { randomUUID, timingSafeEqual } from "node:crypto";

import type { RequestEvent } from "@sveltejs/kit";

import { getPrivateEnv } from "./env";

function configuredToken(event: RequestEvent) {
  const platformEnv = event.platform?.env as Record<string, string | undefined> | undefined;
  return (
    platformEnv?.NOVA_CONSTELLATION_CONTROL_TOKEN ??
    getPrivateEnv("NOVA_CONSTELLATION_CONTROL_TOKEN") ??
    process.env.NOVA_CONSTELLATION_CONTROL_TOKEN
  );
}

function equalSecret(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function authenticateInternalControl(event: RequestEvent) {
  const token = configuredToken(event);
  if (!token) return { ok: false as const, configured: false as const };
  const authorization = event.request.headers.get("authorization") ?? "";
  const presented = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!presented || !equalSecret(presented, token)) {
    return { ok: false as const, configured: true as const };
  }
  return {
    ok: true as const,
    configured: true as const,
    actorId: event.request.headers.get("x-nova-actor-id")?.trim() || "constellation-control-client",
    requestId:
      event.request.headers.get("x-request-id")?.trim() || randomUUID().replaceAll("-", ""),
  };
}
