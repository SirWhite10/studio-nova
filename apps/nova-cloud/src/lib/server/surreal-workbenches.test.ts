import { afterAll, describe, expect, it } from "vite-plus/test";

import { assertTransition, WORKBENCH_TRANSITIONS } from "@studio-nova/data-contracts";

import { closeSurreal } from "./surreal";
import {
  createWorkbenchForStudio,
  getWorkbenchForStudio,
  stopWorkbenchInstance,
  workbenchBelongsTo,
  workbenchSlug,
} from "./surreal-workbenches";

describe("Workbench repository rules", () => {
  it("creates stable URL-safe slugs", () => {
    expect(workbenchSlug("  Customer CRM + Reports  ")).toBe("customer-crm-reports");
    expect(workbenchSlug("***")).toBe("workbench");
    expect(workbenchSlug("a".repeat(80))).toHaveLength(48);
  });

  it("requires both user and Studio ownership", () => {
    const workbench = { userId: "user-1", studioId: "studio:studio-1" };
    expect(workbenchBelongsTo(workbench, "user-1", "studio-1")).toBe(true);
    expect(workbenchBelongsTo(workbench, "user-2", "studio-1")).toBe(false);
    expect(workbenchBelongsTo(workbench, "user-1", "studio-2")).toBe(false);
  });

  it("enforces logical Workbench lifecycle transitions", () => {
    expect(() => assertTransition(WORKBENCH_TRANSITIONS, "ready", "paused")).not.toThrow();
    expect(() => assertTransition(WORKBENCH_TRANSITIONS, "archived", "ready")).toThrow();
  });
});

const integration = process.env.WORKBENCH_INTEGRATION === "1" ? describe : describe.skip;

integration("Workbench repository integration", () => {
  afterAll(async () => closeSurreal());

  it("creates idempotently, scopes ownership, and pauses without deleting identity", async () => {
    const name = `Repository integration ${Date.now()}`;
    const first = await createWorkbenchForStudio({
      userId: "fixture-user",
      studioId: "studio_one",
      name,
    });
    const second = await createWorkbenchForStudio({
      userId: "fixture-user",
      studioId: "studio_one",
      name,
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.workbench._id).toBe(first.workbench._id);
    expect(
      (await getWorkbenchForStudio("fixture-user", "studio_one", first.workbench._id))?._id,
    ).toBe(first.workbench._id);
    expect(
      await getWorkbenchForStudio("another-user", "studio_one", first.workbench._id),
    ).toBeNull();

    const stopped = await stopWorkbenchInstance(first.workbench);
    expect(stopped.workbench._id).toBe(first.workbench._id);
    expect(stopped.workbench.status).toBe("paused");
  });
});
