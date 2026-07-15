import { describe, expect, it } from "vite-plus/test";

import {
  assertRuntimeSecretBoundary,
  runtimeConfigSummary,
  type RuntimeControlConfig,
} from "./config.ts";

const config: RuntimeControlConfig = {
  host: "127.0.0.1",
  port: 8787,
  token: "control-secret",
  kubectl: "kubectl",
  namespacePrefix: "nova",
  runtimeImage: "node:24-alpine",
  runtimeAgentToken: "agent-secret",
  secretProvider: "kubernetes",
};

describe("runtime secret boundary", () => {
  it("accepts opaque references and rejects inline values", () => {
    expect(() =>
      assertRuntimeSecretBoundary({
        secretBindings: [{ reference: "secret://integration/studio/stripe/api-key" }],
        signingKey: "secret://signing/studio/android",
      }),
    ).not.toThrow();
    expect(() => assertRuntimeSecretBoundary({ apiToken: "inline" })).toThrow(
      "inline secret material",
    );
  });

  it("serializes operational config without control or agent credentials", () => {
    const summary = runtimeConfigSummary(config);
    expect(summary).toMatchObject({
      secretProvider: "kubernetes",
      controlAuthenticationConfigured: true,
      agentAuthenticationConfigured: true,
    });
    expect(JSON.stringify(summary)).not.toContain("control-secret");
    expect(JSON.stringify(summary)).not.toContain("agent-secret");
  });
});
