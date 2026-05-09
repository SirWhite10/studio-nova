import { getPrivateEnv } from "./env";

type DomainControlProxy = {
  _id?: string;
  userId: string;
  studioId: string;
  runtimeId?: string;
  proxyName: string;
  proxyType: string;
  localIP: string;
  localPort: number;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

type DomainControlDomain = {
  _id?: string;
  host: string;
  proxyId: string;
  kind: "subdomain" | "custom";
  status: "pending" | "verified" | "active" | "blocked";
  verificationToken?: string;
  createdAt: number;
  updatedAt: number;
};

type DomainControlResolution = {
  proxy: DomainControlProxy;
  domain: DomainControlDomain;
};

const DEFAULT_DOMAIN_CONTROL_URL = "http://10.43.33.86:8790";

function domainControlBaseUrl(path: string) {
  const baseUrl =
    getPrivateEnv("NOVA_DOMAIN_CONTROL_URL") ||
    process.env.NOVA_DOMAIN_CONTROL_URL ||
    DEFAULT_DOMAIN_CONTROL_URL;
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
}

function domainControlHeaders() {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const token = getPrivateEnv("NOVA_DOMAIN_CONTROL_TOKEN") || process.env.NOVA_DOMAIN_CONTROL_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

async function parseDomainControlResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { output: await response.text() };

  if (!response.ok) {
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `Domain control request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export async function listStudioDomainControlDomains(studioId: string) {
  const response = await fetch(
    domainControlBaseUrl(`/admin/studios/${encodeURIComponent(studioId)}/domains`),
    {
      headers: domainControlHeaders(),
    },
  );
  const payload = (await parseDomainControlResponse(response)) as {
    ok: true;
    result: DomainControlResolution[];
  };
  return payload.result;
}

export async function upsertDomainControlProxy(input: {
  userId: string;
  studioId: string;
  runtimeId?: string;
  proxyName: string;
  proxyType?: "http" | "https" | "tcp" | "udp";
  localIP: string;
  localPort: number;
  enabled?: boolean;
  subdomain?: string;
  customDomains?: string[];
}) {
  const response = await fetch(domainControlBaseUrl("/admin/proxies"), {
    method: "POST",
    headers: domainControlHeaders(),
    body: JSON.stringify(input),
  });
  return parseDomainControlResponse(response);
}

export async function syncDomainControlProxy(proxyName: string) {
  const response = await fetch(
    domainControlBaseUrl(`/admin/proxies/${encodeURIComponent(proxyName)}/sync-caddy`),
    {
      method: "POST",
      headers: domainControlHeaders(),
    },
  );
  return parseDomainControlResponse(response);
}

export async function verifyDomainControlDomain(host: string) {
  const response = await fetch(domainControlBaseUrl("/admin/domains/verify"), {
    method: "POST",
    headers: domainControlHeaders(),
    body: JSON.stringify({ host }),
  });
  return parseDomainControlResponse(response);
}

export async function deleteDomainControlDomain(host: string, studioId: string) {
  const response = await fetch(
    domainControlBaseUrl(
      `/admin/domains/${encodeURIComponent(host)}?studioId=${encodeURIComponent(studioId)}`,
    ),
    {
      method: "DELETE",
      headers: domainControlHeaders(),
    },
  );
  return parseDomainControlResponse(response);
}

export type { DomainControlResolution, DomainControlProxy, DomainControlDomain };
