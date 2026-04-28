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
      "workspaces.example.com",
    );

    const result = await store.resolveHost("WS-Studio-1.Workspaces.Example.Com");
    expect(result?.proxy.proxyName).toBe("studio-1-primary");
    expect(result?.domain.host).toBe("ws-studio-1.workspaces.example.com");
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
      "workspaces.example.com",
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
      "workspaces.example.com",
    );

    await store.disableProxy("studio-1-primary");
    await expect(store.resolveHost("ws-studio-1.workspaces.example.com")).resolves.toBeNull();
  });
});
