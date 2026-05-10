const WORKSPACE_ROOT_DOMAIN = "dlx.studio";
const DOMAIN_CONTROL_API_ORIGIN = "https://domains.dlxstudios.com";
const DOMAIN_CNAME_TARGET = "domain.dlx.studio";

export type WorkspaceDomainStatus =
  | "active"
  | "pending"
  | "verified"
  | "verifying"
  | "available"
  | "not-configured";

export type WorkspaceDomainRecord = {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
  status: WorkspaceDomainStatus;
  purpose: string;
};

export type WorkspaceDomain = {
  host: string;
  kind: "nova" | "custom";
  status: WorkspaceDomainStatus;
  target: string;
  https: WorkspaceDomainStatus;
  records: WorkspaceDomainRecord[];
  routingHint?: string;
};

export type WorkspaceDomainSettings = {
  apiOrigin: string;
  workspaceId: string;
  workspaceHost: string;
  defaultDomain: WorkspaceDomain;
  customDomains: WorkspaceDomain[];
  endpoints: {
    createWorkspace: string;
    listDomains: string;
    addDomain: string;
    verifyDomain: string;
    removeDomain: string;
    smokeTest: string;
  };
};

function stableWorkspaceSlug(studioId: string) {
  const normalized = studioId
    .toLowerCase()
    .replace(/^studio:/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return normalized ? `ws-${normalized}` : "ws-new";
}

export function createWorkspaceDomainSettings(studioId: string): WorkspaceDomainSettings {
  const workspaceId = stableWorkspaceSlug(studioId);
  const workspaceHost = `${workspaceId}.${WORKSPACE_ROOT_DOMAIN}`;
  const workspaceApiBase = `/api/studios/${studioId}/domains`;

  return {
    apiOrigin: DOMAIN_CONTROL_API_ORIGIN,
    workspaceId,
    workspaceHost,
    defaultDomain: {
      host: workspaceHost,
      kind: "nova",
      status: "available",
      target: workspaceHost,
      https: "available",
      records: [
        {
          type: "CNAME",
          name: workspaceId,
          value: WORKSPACE_ROOT_DOMAIN,
          status: "available",
          purpose: "Nova-managed workspace hostname",
        },
      ],
    },
    customDomains: [],
    endpoints: {
      createWorkspace: `/api/studios/${studioId}/workspaces`,
      listDomains: workspaceApiBase,
      addDomain: workspaceApiBase,
      verifyDomain: `${workspaceApiBase}/{host}/verify`,
      removeDomain: `${workspaceApiBase}/{host}`,
      smokeTest: `/api/internal/workspace-smoke`,
    },
  };
}

export function createPendingCustomDomain(
  studioId: string,
  host: string,
  input: {
    status?: WorkspaceDomainStatus;
    verificationToken?: string;
    https?: WorkspaceDomainStatus;
  } = {},
): WorkspaceDomain {
  const settings = createWorkspaceDomainSettings(studioId);
  const cleanHost = host.trim().toLowerCase();
  const labels = cleanHost.split(".");
  const looksLikeApex = labels.length === 2;
  const status = input.status ?? "pending";
  const verificationToken = input.verificationToken ?? settings.workspaceId;
  const httpsStatus = input.https ?? (status === "active" ? "active" : "pending");
  return {
    host: cleanHost,
    kind: "custom",
    status,
    target: DOMAIN_CNAME_TARGET,
    https: httpsStatus,
    records: [
      {
        type: "CNAME",
        name: looksLikeApex ? "@" : cleanHost,
        value: DOMAIN_CNAME_TARGET,
        status,
        purpose: looksLikeApex
          ? "Use your DNS provider's ALIAS/ANAME/CNAME flattening support for apex records."
          : "Routes the custom domain to the Nova workspace edge.",
      },
      {
        type: "TXT",
        name: `_nova-domain.${cleanHost}`,
        value: `nova-domain=${verificationToken}`,
        status,
        purpose: "Proves domain ownership before activation",
      },
    ],
    routingHint: looksLikeApex
      ? "Apex domains require ALIAS/ANAME/CNAME flattening support from the DNS provider."
      : "Subdomains can point to domain.dlx.studio with a standard CNAME record.",
  };
}

export function createConfiguredCustomDomain(
  studioId: string,
  host: string,
  input: { status: WorkspaceDomainStatus; verificationToken?: string },
) {
  return createPendingCustomDomain(studioId, host, {
    status: input.status,
    verificationToken: input.verificationToken,
    https: input.status === "active" ? "active" : "pending",
  });
}
