import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createDomainControlServer } from "../src/server.ts";
import { MemoryDomainStore } from "../src/store.ts";
import type { DomainControlConfig } from "../src/config.ts";

vi.mock("../src/verification.ts", async () => {
  const actual =
    await vi.importActual<typeof import("../src/verification.ts")>("../src/verification.ts");
  return {
    ...actual,
    verifyDomainToken: vi.fn(async (host: string, token: string, prefix: string) => ({
      host,
      recordName: `${prefix}.${host}`,
      expectedValue: `nova-domain=${token}`,
      foundValues: [],
      verified: false,
    })),
  };
});

let server: Server | null = null;

const config: DomainControlConfig = {
  storeMode: "memory",
  host: "127.0.0.1",
  port: 0,
  token: "admin-token",
  frpToken: "frp-token",
  caddyAdminUrl: null,
  subdomainHost: "dlx.studio",
  verificationPrefix: "_nova-domain",
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

    const resolved = await fetch(`${baseUrl}/resolve?host=ws-studio-1.dlx.studio`);
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

  test("returns TXT verification instructions for a custom domain", async () => {
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
        customDomains: ["one0.cloud"],
      }),
    });
    expect(created.status).toBe(200);
    const createdPayload = await created.json();
    const token = createdPayload.result[0].domain.verificationToken;
    expect(typeof token).toBe("string");

    const details = await fetch(`${baseUrl}/admin/domains/verify?host=one0.cloud`, {
      headers: {
        authorization: "Bearer admin-token",
      },
    });
    expect(details.status).toBe(200);
    const payload = await details.json();
    expect(payload.status).toBe("pending");
    expect(payload.verification.recordName).toBe("_nova-domain.one0.cloud");
    expect(payload.verification.expectedValue).toBe(`nova-domain=${token}`);
    expect(payload.verification.verified).toBe(false);
  });

  test("activates a custom domain after TXT verification passes", async () => {
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
        customDomains: ["one0.cloud"],
      }),
    });
    const createdPayload = await created.json();
    const token = createdPayload.result[0].domain.verificationToken;

    const { verifyDomainToken } = await import("../src/verification.ts");
    vi.mocked(verifyDomainToken).mockResolvedValueOnce({
      host: "one0.cloud",
      recordName: "_nova-domain.one0.cloud",
      expectedValue: `nova-domain=${token}`,
      foundValues: [`nova-domain=${token}`],
      verified: true,
    });

    const verified = await fetch(`${baseUrl}/admin/domains/verify`, {
      method: "POST",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ host: "one0.cloud" }),
    });
    expect(verified.status).toBe(200);
    const verifiedPayload = await verified.json();
    expect(verifiedPayload.activated).toBe(true);
    expect(verifiedPayload.status).toBe("active");

    const resolved = await fetch(`${baseUrl}/resolve?host=one0.cloud`);
    expect(resolved.status).toBe(200);
  });
});
