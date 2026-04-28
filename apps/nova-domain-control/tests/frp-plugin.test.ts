import { describe, expect, test } from "vite-plus/test";
import { EventEmitter } from "node:events";
import type { IncomingMessage } from "node:http";
import { handleFrpPluginRequest } from "../src/frp-plugin.ts";
import { MemoryDomainStore } from "../src/store.ts";

function request(headers: Record<string, string> = {}) {
  return Object.assign(new EventEmitter(), { headers }) as IncomingMessage;
}

describe("frp plugin handler", () => {
  test("rejects unauthorized plugin calls when a token is configured", async () => {
    const store = new MemoryDomainStore();
    const response = await handleFrpPluginRequest({
      request: request(),
      op: "Login",
      payload: {},
      store,
      frpToken: "secret",
    });
    expect(response.reject).toBe(true);
  });

  test("allows a registered NewProxy request", async () => {
    const store = new MemoryDomainStore();
    await store.upsertProxy(
      {
        userId: "user-1",
        studioId: "studio-1",
        proxyName: "studio-1-primary",
        localPort: 5173,
        subdomain: "ws-studio-1",
      },
      "workspaces.example.com",
    );

    const response = await handleFrpPluginRequest({
      request: request({ "x-nova-frp-token": "secret" }),
      op: "NewProxy",
      payload: { content: { proxy_name: "studio-1-primary" } },
      store,
      frpToken: "secret",
    });
    expect(response.reject).toBe(false);
  });

  test("rejects an unregistered NewProxy request", async () => {
    const store = new MemoryDomainStore();
    const response = await handleFrpPluginRequest({
      request: request({ "x-nova-frp-token": "secret" }),
      op: "NewProxy",
      payload: { proxy_name: "missing" },
      store,
      frpToken: "secret",
    });
    expect(response.reject).toBe(true);
  });
});
