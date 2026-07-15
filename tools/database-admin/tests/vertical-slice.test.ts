import { describe, expect, it } from "vite-plus/test";

import type { DatabaseConfig } from "../src/config.ts";
import { runVerticalSliceSmoke } from "../src/smoke.ts";

const integration = process.env.VERTICAL_SLICE_INTEGRATION === "1" ? describe : describe.skip;

function config(): DatabaseConfig {
  return {
    environment: "test",
    httpUrl: (process.env.SURREALDB_HOST ?? "http://127.0.0.1:18005").replace(/\/$/, ""),
    namespace: process.env.SURREALDB_NAMESPACE ?? "constellation_test",
    database: process.env.SURREALDB_NAME ?? "constellation_test",
    username: process.env.SURREALDB_USER ?? "root",
    password: process.env.SURREALDB_PASSWORD ?? "integration-only-secret",
    authLevel: "root",
    timeoutMs: 15_000,
    repoRoot: new URL("../../..", import.meta.url).pathname.replace(/\/$/, ""),
  };
}

describe("vertical-slice smoke safety", () => {
  it("requires explicit disposable confirmation", async () => {
    await expect(runVerticalSliceSmoke(config())).rejects.toThrow("explicit disposable-database");
  });

  it("always refuses production environments", async () => {
    await expect(
      runVerticalSliceSmoke(
        { ...config(), environment: "production" },
        { confirmedDisposable: true },
      ),
    ).rejects.toThrow("disabled for production");
  });
});

integration("Constellation vertical slice", () => {
  it("keeps source, releases, runtimes, tunnels, routes, and rollback traceable", async () => {
    const result = await runVerticalSliceSmoke(config(), { confirmedDisposable: true });
    expect(result.host).toMatch(/\.example\.test$/);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        "initial route is active",
        "Deployment remains active after Workbench stop",
        "failed replacement preserves first route",
        "healthy replacement cuts over atomically",
        "native tunnel reconnects without record replacement",
        "Habitat re-registers with stable identity",
        "rollback reuses first immutable Release",
        "lifecycle audit trace is complete",
      ]),
    );
  });
});
