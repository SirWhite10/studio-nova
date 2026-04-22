import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type RuntimeControlConfig = {
  host: string;
  port: number;
  token: string | null;
  kubectl: string;
  namespacePrefix: string;
  runtimeImage: string;
};

function loadDotEnvFile(path: string) {
  try {
    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, "");
      process.env[key] ??= value;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

loadDotEnvFile(resolve(process.cwd(), ".env.local"));

function readInt(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function loadConfig(): RuntimeControlConfig {
  return {
    host: process.env.NOVA_RUNTIME_CONTROL_HOST || "127.0.0.1",
    port: readInt("NOVA_RUNTIME_CONTROL_PORT", 8787),
    token: process.env.NOVA_RUNTIME_CONTROL_TOKEN || null,
    kubectl: process.env.NOVA_RUNTIME_KUBECTL || "kubectl",
    namespacePrefix: process.env.NOVA_RUNTIME_NAMESPACE_PREFIX || "nova-runtime",
    runtimeImage: process.env.NOVA_RUNTIME_IMAGE || "busybox:1.36",
  };
}
