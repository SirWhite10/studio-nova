import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vite-plus/test";

import { runBackfill, verifyBackfill } from "../src/backfill.ts";
import type { DatabaseConfig } from "../src/config.ts";
import { queryResult, querySurreal } from "../src/surreal-http.ts";

const integrationUrl = process.env.DATABASE_ADMIN_INTEGRATION_URL;
const integration = integrationUrl ? describe : describe.skip;

integration("legacy compatibility integration", () => {
  const config: DatabaseConfig = {
    environment: "integration",
    httpUrl: integrationUrl ?? "http://127.0.0.1:18005",
    namespace: process.env.DATABASE_ADMIN_INTEGRATION_NS ?? "constellation_test",
    database: process.env.DATABASE_ADMIN_INTEGRATION_DB ?? "constellation_test",
    username: process.env.DATABASE_ADMIN_INTEGRATION_USER ?? "root",
    password: process.env.DATABASE_ADMIN_INTEGRATION_PASSWORD,
    authLevel: "root",
    timeoutMs: 15_000,
    repoRoot: join(dirname(fileURLToPath(import.meta.url)), "../../.."),
  };

  it("preserves legacy reads and creates one idempotent lifecycle mapping", async () => {
    const fixture = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "fixtures/legacy.surql"),
      "utf8",
    );
    await querySurreal(config, fixture);

    const before = await queryResult<number>(
      config,
      "RETURN array::len(SELECT id FROM workspace);",
    );
    const first = await runBackfill(config);
    const firstCounts = await verifyBackfill(config);
    const second = await runBackfill(config);
    const secondCounts = await verifyBackfill(config);
    const after = await queryResult<number>(config, "RETURN array::len(SELECT id FROM workspace);");

    expect(before).toBe(1);
    expect(after).toBe(before);
    expect(first.plan.skipped).toEqual([]);
    expect(first.plan.runtimeInstances).toBe(1);
    expect(first.plan.deploymentRoutes).toBe(1);
    expect(secondCounts).toEqual(firstCounts);
    expect(second.statementCount).toBe(first.statementCount);
  });
});
