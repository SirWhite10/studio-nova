import { describe, expect, it } from "vite-plus/test";

import {
  assertTransition,
  BUILD_JOB_TRANSITIONS,
  canTransition,
  DEPLOYMENT_TRANSITIONS,
  RELEASE_TRANSITIONS,
  ROUTE_TRANSITIONS,
  RUNTIME_INSTANCE_TRANSITIONS,
  WORKBENCH_INSTANCE_TRANSITIONS,
  WORKBENCH_TRANSITIONS,
} from "../src/lifecycle.js";

describe("lifecycle transitions", () => {
  it("accepts idempotent and declared transitions", () => {
    expect(canTransition(WORKBENCH_TRANSITIONS, "ready", "ready")).toBe(true);
    expect(canTransition(BUILD_JOB_TRANSITIONS, "building", "uploading")).toBe(true);
    expect(canTransition(DEPLOYMENT_TRANSITIONS, "activating", "active")).toBe(true);
    expect(canTransition(WORKBENCH_INSTANCE_TRANSITIONS, "ready", "stopping")).toBe(true);
    expect(canTransition(RELEASE_TRANSITIONS, "assembling", "ready")).toBe(true);
    expect(canTransition(RUNTIME_INSTANCE_TRANSITIONS, "starting", "healthy")).toBe(true);
    expect(canTransition(ROUTE_TRANSITIONS, "validating", "active")).toBe(true);
  });

  it("rejects transitions that skip required health gates", () => {
    expect(canTransition(DEPLOYMENT_TRANSITIONS, "pending", "active")).toBe(false);
    expect(() => assertTransition(DEPLOYMENT_TRANSITIONS, "pending", "active")).toThrow(
      "pending -> active",
    );
    expect(canTransition(WORKBENCH_INSTANCE_TRANSITIONS, "stopped", "ready")).toBe(false);
    expect(canTransition(RELEASE_TRANSITIONS, "ready", "assembling")).toBe(false);
    expect(canTransition(RUNTIME_INSTANCE_TRANSITIONS, "provisioning", "healthy")).toBe(false);
    expect(canTransition(ROUTE_TRANSITIONS, "pending", "active")).toBe(false);
  });

  it("keeps terminal build states terminal", () => {
    expect(canTransition(BUILD_JOB_TRANSITIONS, "succeeded", "building")).toBe(false);
    expect(canTransition(BUILD_JOB_TRANSITIONS, "canceled", "queued")).toBe(false);
  });
});
