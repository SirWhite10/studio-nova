import type { DomainKind } from "./types.ts";

const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const RESERVED_LABELS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "dashboard",
  "login",
  "mail",
  "root",
  "support",
  "www",
]);

export function normalizeHost(input: string) {
  const host = input.trim().toLowerCase().replace(/\.$/, "");
  const withoutPort = host.startsWith("[")
    ? host
    : host.includes(":")
      ? host.slice(0, host.lastIndexOf(":"))
      : host;
  return withoutPort;
}

export function validateHost(host: string) {
  const normalized = normalizeHost(host);
  if (!normalized || normalized.length > 253) {
    return { ok: false as const, error: "Host is empty or too long" };
  }

  if (normalized.includes("..") || normalized.startsWith(".") || normalized.endsWith(".")) {
    return { ok: false as const, error: "Host contains an invalid dot sequence" };
  }

  const labels = normalized.split(".");
  if (labels.length < 2) {
    return { ok: false as const, error: "Host must include a registrable domain" };
  }

  for (const label of labels) {
    if (!HOST_LABEL.test(label)) {
      return { ok: false as const, error: `Invalid host label: ${label}` };
    }
  }

  return { ok: true as const, host: normalized };
}

export function normalizeSubdomain(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "");
}

export function validateSubdomain(input: string) {
  const subdomain = normalizeSubdomain(input);
  if (!subdomain || subdomain.length > 63) {
    return { ok: false as const, error: "Subdomain is empty or too long" };
  }

  if (!HOST_LABEL.test(subdomain)) {
    return { ok: false as const, error: "Subdomain contains invalid characters" };
  }

  if (RESERVED_LABELS.has(subdomain)) {
    return { ok: false as const, error: "Subdomain is reserved" };
  }

  return { ok: true as const, subdomain };
}

export function generatedHost(subdomain: string, subdomainHost: string) {
  const safeSubdomain = validateSubdomain(subdomain);
  if (!safeSubdomain.ok) throw new Error(safeSubdomain.error);

  const safeBase = validateHost(subdomainHost);
  if (!safeBase.ok) throw new Error(safeBase.error);

  return `${safeSubdomain.subdomain}.${safeBase.host}`;
}

export function classifyHost(host: string, subdomainHost: string): DomainKind | null {
  const safeHost = validateHost(host);
  const safeBase = validateHost(subdomainHost);
  if (!safeHost.ok || !safeBase.ok) return null;

  return safeHost.host.endsWith(`.${safeBase.host}`) ? "subdomain" : "custom";
}

export function isReservedCustomDomain(host: string, subdomainHost: string) {
  const safeHost = validateHost(host);
  const safeBase = validateHost(subdomainHost);
  if (!safeHost.ok || !safeBase.ok) return true;
  return safeHost.host === safeBase.host || safeHost.host.endsWith(`.${safeBase.host}`);
}
