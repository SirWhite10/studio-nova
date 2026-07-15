import {
  createConfiguredCustomDomain,
  createWorkspaceDomainSettings,
  type WorkspaceDomain,
  type WorkspaceDomainSettings,
  type WorkspaceDomainStatus,
} from "$lib/domains/workspace-domains";
import {
  activateDeploymentRouteControl,
  deleteDomainControlDomain,
  listStudioDomainControlDomains,
  syncDomainControlProxy,
  upsertDomainControlProxy,
  verifyDomainBindingControl,
  verifyDomainControlDomain,
  type DomainControlResolution,
} from "./nova-domain-control";
import { getPrimaryForStudio } from "./surreal-runtime-processes";
import { normalizeRouteParam } from "./surreal-records";
import {
  activatePlannedDeploymentRoute,
  createDomainBinding,
  getDomainBindingForStudio,
  listDomainBindingsForStudio,
  markDomainBindingVerified,
  markDomainCertificateActive,
  planDeploymentRoute,
  revokeDomainBinding,
  type DomainBindingRow,
} from "./surreal-edge-routing";
import { getSurrealSchemaReport } from "./surreal-schema";

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

function mapBindingStatus(binding: DomainBindingRow): WorkspaceDomainStatus {
  if (binding.ownershipStatus === "revoked" || binding.ownershipStatus === "failed") {
    return "not-configured";
  }
  if (binding.ownershipStatus !== "verified") return "pending";
  return binding.certificateStatus === "active" ? "active" : "verified";
}

function mapDomainBinding(studioId: string, binding: DomainBindingRow): WorkspaceDomain {
  return createConfiguredCustomDomain(studioId, binding.host, {
    status: mapBindingStatus(binding),
    verificationToken: binding.verificationToken ?? undefined,
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

export async function loadStudioDomainSettings(userId: string, studioId: string) {
  const settings = createWorkspaceDomainSettings(studioId);
  const legacyRows = await listStudioDomainControlDomains(studioId).catch(() => []);
  const report = await getSurrealSchemaReport();
  const bindings =
    report.mode === "versioned"
      ? await listDomainBindingsForStudio(userId, studioId).catch(() => [])
      : [];
  const byHost = new Map<string, WorkspaceDomain>();
  for (const row of legacyRows.filter((row) => row.domain.kind === "custom")) {
    byHost.set(row.domain.host, mapDomainRow(studioId, row));
  }
  for (const binding of bindings.filter((binding) => binding.kind === "custom")) {
    byHost.set(binding.host, mapDomainBinding(studioId, binding));
  }
  return {
    ...settings,
    customDomains: [...byHost.values()],
  } satisfies WorkspaceDomainSettings;
}

async function addLegacyStudioCustomDomain(input: {
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

export async function addStudioCustomDomain(input: {
  userId: string;
  studioId: string;
  host: string;
}) {
  const report = await getSurrealSchemaReport();
  if (report.mode !== "versioned") return addLegacyStudioCustomDomain(input);

  const result = await createDomainBinding({
    userId: input.userId,
    studioId: input.studioId,
    host: input.host,
    kind: "custom",
  });
  await addLegacyStudioCustomDomain(input).catch(() => null);
  return mapDomainBinding(normalizeRouteParam(input.studioId), result.binding);
}

export async function verifyStudioCustomDomain(userId: string, studioId: string, host: string) {
  const report = await getSurrealSchemaReport();
  const result = (await (report.mode === "versioned"
    ? verifyDomainBindingControl(host)
    : verifyDomainControlDomain(host))) as {
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

  if (report.mode === "versioned" && result.verification.verified) {
    let binding = await markDomainBindingVerified({ userId, studioId, host });
    binding = await markDomainCertificateActive(binding);
    return {
      ...result,
      domain: mapDomainBinding(studioId, binding),
    };
  }

  return {
    ...result,
    domain: createConfiguredCustomDomain(studioId, host, {
      status: mapDomainStatus(result.status),
      verificationToken: result.verification.expectedValue.replace(/^nova-domain=/, ""),
    }),
  };
}

export async function removeStudioCustomDomain(userId: string, studioId: string, host: string) {
  const report = await getSurrealSchemaReport();
  if (report.mode === "versioned") {
    const binding = await getDomainBindingForStudio(userId, studioId, host);
    if (binding) await revokeDomainBinding({ userId, studioId, host });
  }
  await deleteDomainControlDomain(host, studioId).catch(() => null);
  return { ok: true, host };
}

export async function activateStudioDomainRoute(input: {
  userId: string;
  studioId: string;
  host: string;
  deploymentId: string;
}) {
  const plan = await planDeploymentRoute(input);
  await activateDeploymentRouteControl({
    userId: input.userId,
    studioId: normalizeRouteParam(input.studioId),
    host: plan.domain.host,
    deploymentId: plan.deployment._id,
    runtimeInstanceId: plan.runtime._id,
    serviceKey: plan.runtime.serviceKey,
    connectorKey: plan.connector.connectorKey,
    horizonNodeId: plan.horizon._id,
  });
  return {
    ok: true,
    route: await activatePlannedDeploymentRoute(plan),
  };
}
