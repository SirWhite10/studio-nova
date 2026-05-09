import {
  createConfiguredCustomDomain,
  createWorkspaceDomainSettings,
  type WorkspaceDomain,
  type WorkspaceDomainSettings,
  type WorkspaceDomainStatus,
} from "$lib/domains/workspace-domains";
import {
  deleteDomainControlDomain,
  listStudioDomainControlDomains,
  syncDomainControlProxy,
  upsertDomainControlProxy,
  verifyDomainControlDomain,
  type DomainControlResolution,
} from "./nova-domain-control";
import { getPrimaryForStudio } from "./surreal-runtime-processes";
import { normalizeRouteParam } from "./surreal-records";

function mapDomainStatus(
  status: DomainControlResolution["domain"]["status"],
): WorkspaceDomainStatus {
  if (status === "active") return "active";
  if (status === "verified") return "verified";
  if (status === "blocked") return "not-configured";
  return "pending";
}

function mapDomainRow(studioId: string, row: DomainControlResolution): WorkspaceDomain {
  return createConfiguredCustomDomain(studioId, row.domain.host, {
    status: mapDomainStatus(row.domain.status),
    verificationToken: row.domain.verificationToken,
  });
}

function sanitizeProxySuffix(host: string) {
  return (
    host
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "domain"
  );
}

function parsePreviewTarget(previewUrl: string) {
  const parsed = new URL(previewUrl);
  return {
    localIP: parsed.hostname,
    localPort: Number.parseInt(parsed.port || (parsed.protocol === "https:" ? "443" : "80"), 10),
  };
}

async function resolveStudioPreviewTarget(userId: string, studioId: string) {
  const primary = await getPrimaryForStudio(userId, studioId);
  if (!primary?.previewUrl) {
    throw new Error("Start a workspace preview before attaching a custom domain");
  }
  if (!primary.workspaceId) {
    throw new Error("Primary preview is missing a workspace binding");
  }
  const target = parsePreviewTarget(primary.previewUrl);
  return {
    ...target,
    primary,
  };
}

export async function loadStudioDomainSettings(studioId: string) {
  const settings = createWorkspaceDomainSettings(studioId);
  const rows = await listStudioDomainControlDomains(studioId).catch(() => []);
  return {
    ...settings,
    customDomains: rows
      .filter((row) => row.domain.kind === "custom")
      .map((row) => mapDomainRow(studioId, row)),
  } satisfies WorkspaceDomainSettings;
}

export async function addStudioCustomDomain(input: {
  userId: string;
  studioId: string;
  host: string;
}) {
  const cleanStudioId = normalizeRouteParam(input.studioId);
  const cleanHost = input.host.trim().toLowerCase();
  const target = await resolveStudioPreviewTarget(input.userId, cleanStudioId);
  const proxyName = `studio-${cleanStudioId}-${sanitizeProxySuffix(cleanHost)}`;
  const upsert = (await upsertDomainControlProxy({
    userId: input.userId,
    studioId: cleanStudioId,
    runtimeId: target.primary.workspaceId ?? undefined,
    proxyName,
    proxyType: "http",
    localIP: target.localIP,
    localPort: target.localPort,
    enabled: true,
    customDomains: [cleanHost],
  })) as { ok: true; result: DomainControlResolution[] };

  await syncDomainControlProxy(proxyName);
  const resolution = upsert.result.find((row) => row.domain.host === cleanHost) ?? upsert.result[0];
  if (!resolution) {
    throw new Error("Failed to attach custom domain");
  }
  return mapDomainRow(cleanStudioId, resolution);
}

export async function verifyStudioCustomDomain(studioId: string, host: string) {
  const result = (await verifyDomainControlDomain(host)) as {
    ok: true;
    host: string;
    activated?: boolean;
    status: DomainControlResolution["domain"]["status"];
    verification: {
      expectedValue: string;
      foundValues: string[];
      recordName: string;
      verified: boolean;
    };
  };

  return {
    ...result,
    domain: createConfiguredCustomDomain(studioId, host, {
      status: mapDomainStatus(result.status),
      verificationToken: result.verification.expectedValue.replace(/^nova-domain=/, ""),
    }),
  };
}

export async function removeStudioCustomDomain(studioId: string, host: string) {
  await deleteDomainControlDomain(host, studioId);
  return { ok: true, host };
}
