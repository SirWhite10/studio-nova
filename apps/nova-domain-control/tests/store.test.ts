import { describe, expect, test } from "vite-plus/test";
import { MemoryDomainStore } from "../src/store.ts";

describe("MemoryDomainStore", () => {
  test("resolves active generated subdomain proxies", async () => {
    const store = new MemoryDomainStore();

    await store.upsertProxy(
      {
        userId: "user-1",
        studioId: "studio-1",
        proxyName: "studio-1-primary",
        localPort: 5173,
        subdomain: "ws-studio-1",
      },
      "dlx.studio",
    );

    const result = await store.resolveHost("WS-Studio-1.Dlx.Studio");
    expect(result?.proxy.proxyName).toBe("studio-1-primary");
    expect(result?.domain.host).toBe("ws-studio-1.dlx.studio");
    expect(result?.domain.status).toBe("active");
  });

  test("keeps custom domains pending until verification", async () => {
    const store = new MemoryDomainStore();

    await store.upsertProxy(
      {
        userId: "user-1",
        studioId: "studio-1",
        proxyName: "studio-1-primary",
        localPort: 5173,
        customDomains: ["preview.customer.com"],
      },
      "dlx.studio",
    );

    await expect(store.resolveHost("preview.customer.com")).resolves.toBeNull();
  });

  test("disables proxy resolution", async () => {
    const store = new MemoryDomainStore();

    await store.upsertProxy(
      {
        userId: "user-1",
        studioId: "studio-1",
        proxyName: "studio-1-primary",
        localPort: 5173,
        subdomain: "ws-studio-1",
      },
      "dlx.studio",
    );

    await store.disableProxy("studio-1-primary");
    await expect(store.resolveHost("ws-studio-1.dlx.studio")).resolves.toBeNull();
  });
});
