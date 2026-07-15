import { afterAll, describe, expect, it } from "vite-plus/test";

import { assertTransition, BUILD_JOB_TRANSITIONS } from "@studio-nova/data-contracts";

import { closeSurreal } from "./surreal";
import {
  buildQueueDecision,
  capabilityTokens,
  getBuildTargetProfile,
  targetCompatibility,
} from "./surreal-builds";

describe("Build scheduling", () => {
  const target = {
    requiredCapabilities: ["os:linux", "toolchain:node-24", "target:web"],
  };

  it("normalizes structured node capabilities into scheduler tokens", () => {
    expect(
      capabilityTokens({
        operatingSystems: ["Linux"],
        architectures: ["x86_64"],
        toolchains: ["Node-24"],
        runtimes: ["containerd"],
        features: ["target:web"],
      }),
    ).toEqual(["arch:x86_64", "os:linux", "runtime:containerd", "target:web", "toolchain:node-24"]);
  });

  it("returns deterministic missing capabilities before assigning work", () => {
    const result = targetCompatibility(target, {
      role: "forge",
      status: "online",
      capabilities: { operatingSystems: ["linux"], features: ["target:web"] },
    });
    expect(result.compatible).toBe(false);
    expect(result.missing).toEqual(["toolchain:node-24"]);
  });

  it("requires a live Forge even when capability tokens match", () => {
    const capabilities = {
      operatingSystems: ["linux"],
      toolchains: ["node-24"],
      features: ["target:web"],
    };
    expect(
      targetCompatibility(target, { role: "habitat", status: "online", capabilities }),
    ).toMatchObject({ compatible: false, missing: [] });
    expect(
      targetCompatibility(target, { role: "forge", status: "offline", capabilities }),
    ).toMatchObject({ compatible: false, missing: [] });
  });

  it("selects a compatible Forge deterministically and explains queued work", () => {
    const matchingCapabilities = {
      operatingSystems: ["linux"],
      toolchains: ["node-24"],
      features: ["target:web"],
    };
    const assigned = buildQueueDecision(target, [
      {
        id: "forge:zeta",
        _id: "zeta",
        nodeKey: "zeta",
        role: "forge",
        status: "online",
        capabilities: matchingCapabilities,
      },
      {
        id: "forge:alpha",
        _id: "alpha",
        nodeKey: "alpha",
        role: "forge",
        status: "online",
        capabilities: matchingCapabilities,
      },
    ]);
    expect(assigned).toMatchObject({ policy: "assigned", queueReason: null });
    expect(assigned.node?._id).toBe("alpha");

    const unavailable = buildQueueDecision(target, [
      {
        id: "forge:offline",
        _id: "offline",
        nodeKey: "offline-forge",
        role: "forge",
        status: "offline",
        capabilities: matchingCapabilities,
      },
    ]);
    expect(unavailable).toMatchObject({
      policy: "queued",
      missingCapabilities: [],
      queueReason: "Compatible Forge node offline-forge is offline",
    });

    const missing = buildQueueDecision(target, [
      {
        id: "forge:minimal",
        _id: "minimal",
        nodeKey: "minimal-forge",
        role: "forge",
        status: "online",
        capabilities: { operatingSystems: ["linux"] },
      },
    ]);
    expect(missing).toMatchObject({
      policy: "queued",
      missingCapabilities: ["target:web", "toolchain:node-24"],
      queueReason: "Missing target capability web, toolchain node-24 on Forge node minimal-forge",
    });
  });

  it("rejects Build Job transition shortcuts", () => {
    expect(() => assertTransition(BUILD_JOB_TRANSITIONS, "assigned", "building")).toThrow();
    expect(() => assertTransition(BUILD_JOB_TRANSITIONS, "assigned", "preparing")).not.toThrow();
  });
});

const integration = process.env.BUILD_TARGET_INTEGRATION === "1" ? describe : describe.skip;

integration("seeded build target scheduling", () => {
  afterAll(async () => closeSurreal());

  it("assigns Linux targets and queues unavailable native hosts before resource use", async () => {
    const keys = [
      "web-pwa",
      "android-flutter",
      "server-node",
      "ios-flutter",
      "macos-flutter",
      "windows-flutter",
    ] as const;
    const profiles = Object.fromEntries(
      await Promise.all(
        keys.map(async (key) => {
          const profile = await getBuildTargetProfile(key);
          expect(profile).not.toBeNull();
          return [key, profile!];
        }),
      ),
    );
    const linuxForge = {
      id: "infrastructure_node:linux-forge",
      _id: "linux-forge",
      nodeKey: "linux-forge",
      role: "forge",
      status: "online",
      capabilities: {
        operatingSystems: ["linux"],
        architectures: ["x86_64"],
        toolchains: ["node-24", "flutter", "android-sdk"],
        runtimes: ["containerd"],
        features: [
          "package:web-bundle",
          "package:android",
          "package:oci",
          "signing:android",
          "target:web",
          "target:pwa",
          "target:android",
          "target:server",
        ],
      },
    };

    for (const key of ["web-pwa", "android-flutter", "server-node"] as const) {
      expect(buildQueueDecision(profiles[key], [linuxForge]).policy).toBe("assigned");
    }
    for (const key of ["ios-flutter", "macos-flutter", "windows-flutter"] as const) {
      const decision = buildQueueDecision(profiles[key], [linuxForge]);
      expect(decision.policy).toBe("queued");
      expect(decision.node).toBeNull();
      expect(decision.queueReason).toMatch(/^Missing /);
    }
    expect(buildQueueDecision(profiles["ios-flutter"], [linuxForge]).missingCapabilities).toEqual(
      expect.arrayContaining(["os:macos", "toolchain:xcode", "signing:apple"]),
    );
  });
});
