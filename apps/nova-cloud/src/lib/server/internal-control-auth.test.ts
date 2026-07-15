import type { RequestEvent } from "@sveltejs/kit";
import { describe, expect, it } from "vite-plus/test";

import { authenticateInternalControl } from "./internal-control-auth";

function event(token: string, authorization?: string, headers: Record<string, string> = {}) {
  return {
    platform: { env: { NOVA_CONSTELLATION_CONTROL_TOKEN: token } },
    request: new Request("http://internal.test/api/internal/nodes/register", {
      headers: {
        ...(authorization ? { authorization } : {}),
        ...headers,
      },
    }),
  } as unknown as RequestEvent;
}

describe("internal control authentication", () => {
  it("fails closed when no control credential is configured", () => {
    expect(authenticateInternalControl(event(""))).toEqual({
      ok: false,
      configured: false,
    });
  });

  it("rejects missing, malformed, and incorrect bearer credentials", () => {
    expect(authenticateInternalControl(event("expected"))).toMatchObject({
      ok: false,
      configured: true,
    });
    expect(authenticateInternalControl(event("expected", "Basic expected"))).toMatchObject({
      ok: false,
      configured: true,
    });
    expect(authenticateInternalControl(event("expected", "Bearer wrong"))).toMatchObject({
      ok: false,
      configured: true,
    });
  });

  it("accepts an exact bearer credential and preserves trace headers", () => {
    expect(
      authenticateInternalControl(
        event("expected", "Bearer expected", {
          "x-nova-actor-id": "habitat-one",
          "x-request-id": "request-one",
        }),
      ),
    ).toEqual({
      ok: true,
      configured: true,
      actorId: "habitat-one",
      requestId: "request-one",
    });
  });
});
