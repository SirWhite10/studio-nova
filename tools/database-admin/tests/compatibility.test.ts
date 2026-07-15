import { describe, expect, it } from "vite-plus/test";

import { evaluateCompatibility } from "../src/compatibility.ts";

describe("schema compatibility", () => {
  it("rejects a missing or old schema marker", () => {
    expect(evaluateCompatibility(undefined, 1, "nova-cloud").compatible).toBe(false);
    expect(
      evaluateCompatibility(
        { key: "old", version: 1, phase: "baseline", compatibleServices: ["nova-cloud"] },
        2,
        "nova-cloud",
      ).reason,
    ).toContain("below required version");
  });

  it("requires service compatibility when a release declares a service list", () => {
    const release = {
      key: "constellation-v1",
      version: 1,
      phase: "expand" as const,
      compatibleServices: ["nova-cloud"],
    };

    expect(evaluateCompatibility(release, 1, "nova-cloud").compatible).toBe(true);
    expect(evaluateCompatibility(release, 1, "nova-edge").compatible).toBe(false);
  });
});
