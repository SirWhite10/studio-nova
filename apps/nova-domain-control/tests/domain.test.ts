import { describe, expect, test } from "vite-plus/test";
import {
  classifyHost,
  generatedHost,
  isReservedCustomDomain,
  normalizeHost,
  validateHost,
  validateSubdomain,
} from "../src/domain.ts";

describe("domain helpers", () => {
  test("normalizes host casing, trailing dots, and ports", () => {
    expect(normalizeHost(" WS-Abc.Dlx.Studio. ")).toBe("ws-abc.dlx.studio");
    expect(normalizeHost("example.com:443")).toBe("example.com");
  });

  test("validates dns hosts", () => {
    expect(validateHost("ws-abc.dlx.studio")).toEqual({
      ok: true,
      host: "ws-abc.dlx.studio",
    });
    expect(validateHost("bad_host.example.com").ok).toBe(false);
    expect(validateHost("localhost").ok).toBe(false);
  });

  test("validates generated subdomains", () => {
    expect(validateSubdomain("ws-abc123")).toEqual({ ok: true, subdomain: "ws-abc123" });
    expect(validateSubdomain("admin").ok).toBe(false);
    expect(validateSubdomain("bad_value").ok).toBe(false);
  });

  test("generates and classifies workspace hosts", () => {
    const host = generatedHost("ws-abc123", "dlx.studio");
    expect(host).toBe("ws-abc123.dlx.studio");
    expect(classifyHost(host, "dlx.studio")).toBe("subdomain");
    expect(classifyHost("customer.example.com", "dlx.studio")).toBe("custom");
  });

  test("blocks custom domains under the generated workspace base", () => {
    expect(isReservedCustomDomain("ws-abc.dlx.studio", "dlx.studio")).toBe(true);
    expect(isReservedCustomDomain("customer.example.com", "dlx.studio")).toBe(false);
  });
});
