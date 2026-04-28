import { afterEach, describe, expect, test } from "vite-plus/test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createDomainControlServer } from "../src/server.ts";
import { MemoryDomainStore } from "../src/store.ts";
import type { DomainControlConfig } from "../src/config.ts";

let server: Server | null = null;

const config: DomainControlConfig = {
  host: "127.0.0.1",
  port: 0,
  token: "admin-token",
  frpToken: "frp-token",
  subdomainHost: "workspaces.example.com",
  surreal: {
    url: "memory",
    namespace: "main",
    database: "main",
    username: "root",
    password: "root",
    connectTimeoutMs: 1000,
  },
};

async function start() {
  const store = new MemoryDomainStore();
  server = createDomainControlServer(config, store);
  await new Promise<void>((resolve) => {
    server?.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server?.close((error) => (error ? reject(error) : resolve()));
  });
  server = null;
});

describe("domain control server", () => {
  test("registers and resolves a generated workspace proxy", async () => {
    const baseUrl = await start();

    const created = await fetch(`${baseUrl}/admin/proxies`, {
      method: "POST",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        userId: "user-1",
        studioId: "studio-1",
        proxyName: "studio-1-primary",
        localPort: 5173,
        subdomain: "ws-studio-1",
      }),
    });
    expect(created.status).toBe(200);

    const resolved = await fetch(`${baseUrl}/resolve?host=ws-studio-1.workspaces.example.com`);
    expect(resolved.status).toBe(200);
    const payload = await resolved.json();
    expect(payload.result.proxy.proxyName).toBe("studio-1-primary");
    expect(payload.result.domain.kind).toBe("subdomain");
  });

  test("gates frp NewProxy through registered proxy state", async () => {
    const baseUrl = await start();

    const rejected = await fetch(`${baseUrl}/frp/handler?op=NewProxy`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-nova-frp-token": "frp-token",
      },
      body: JSON.stringify({ proxy_name: "missing" }),
    });
    expect((await rejected.json()).reject).toBe(true);
  });
});
