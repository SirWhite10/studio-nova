import { describe, expect, it } from "vite-plus/test";

import {
  evaluateCapabilities,
  explainMissingCapabilities,
  normalizeCapabilityTokens,
} from "../src/capabilities.js";

const targets = {
  web: ["os:linux", "arch:x86_64", "toolchain:node-24", "target:web"],
  pwa: ["os:linux", "arch:x86_64", "toolchain:node-24", "target:pwa"],
  android: [
    "os:linux",
    "arch:x86_64",
    "toolchain:flutter",
    "toolchain:android-sdk",
    "signing:android",
    "target:android",
  ],
  ios: [
    "os:macos",
    "arch:arm64",
    "toolchain:flutter",
    "toolchain:xcode",
    "signing:apple",
    "target:ios",
  ],
  windows: [
    "os:windows",
    "arch:x86_64",
    "toolchain:flutter",
    "toolchain:visual-studio",
    "signing:windows",
    "target:windows",
  ],
} as const;

const runners = {
  linux: [
    "os:linux",
    "arch:amd64",
    "toolchain:node-24",
    "toolchain:flutter",
    "toolchain:android-sdk",
    "signing:android",
    "target:web",
    "target:pwa",
    "target:android",
  ],
  macos: [
    "os:darwin",
    "arch:aarch64",
    "toolchain:flutter",
    "toolchain:xcode",
    "signing:apple",
    "target:ios",
  ],
  windows: [
    "os:win32",
    "arch:amd64",
    "toolchain:flutter",
    "toolchain:visual-studio",
    "signing:windows",
    "target:windows",
  ],
} as const;

describe("build capability matrix", () => {
  it("normalizes aliases and duplicate capability tokens deterministically", () => {
    expect(normalizeCapabilityTokens([" ARCH:AMD64 ", "arch:x86_64", "OS:Darwin"])).toEqual([
      "arch:x86_64",
      "os:macos",
    ]);
  });

  it("matches each target only to a runner with every declared requirement", () => {
    expect(evaluateCapabilities(targets.web, runners.linux).compatible).toBe(true);
    expect(evaluateCapabilities(targets.pwa, runners.linux).compatible).toBe(true);
    expect(evaluateCapabilities(targets.android, runners.linux).compatible).toBe(true);
    expect(evaluateCapabilities(targets.ios, runners.macos).compatible).toBe(true);
    expect(evaluateCapabilities(targets.windows, runners.windows).compatible).toBe(true);

    expect(evaluateCapabilities(targets.ios, runners.linux).compatible).toBe(false);
    expect(evaluateCapabilities(targets.windows, runners.linux).compatible).toBe(false);
    expect(evaluateCapabilities(targets.android, runners.macos).compatible).toBe(false);
  });

  it("returns stable, operator-readable missing requirements", () => {
    const result = evaluateCapabilities(targets.ios, runners.linux);
    expect(result.missing).toEqual([
      "arch:arm64",
      "os:macos",
      "signing:apple",
      "target:ios",
      "toolchain:xcode",
    ]);
    expect(explainMissingCapabilities(result.missing)).toBe(
      "Missing architecture arm64, operating system macos, signing capability apple, target capability ios, toolchain xcode",
    );
  });
});
