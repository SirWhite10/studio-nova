const WORKSPACE_ROOT_DOMAIN = "workspace.dlxstudios.com";
const DOMAIN_CONTROL_API_ORIGIN = "https://domains.dlxstudios.com";

export type WorkspaceDomainStatus =
  | "active"
  | "pending"
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
  const workspaceApiBase = `${DOMAIN_CONTROL_API_ORIGIN}/v1/workspaces/${workspaceId}`;

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
      createWorkspace: workspaceApiBase,
      listDomains: `${workspaceApiBase}/domains`,
      addDomain: `${workspaceApiBase}/domains`,
      verifyDomain: `${workspaceApiBase}/domains/{host}/verify`,
      removeDomain: `${workspaceApiBase}/domains/{host}`,
      smokeTest: `${DOMAIN_CONTROL_API_ORIGIN}/v1/smoke/workspace-domain`,
    },
  };
}

export function createPendingCustomDomain(studioId: string, host: string): WorkspaceDomain {
  const settings = createWorkspaceDomainSettings(studioId);
  const cleanHost = host.trim().toLowerCase();
  return {
    host: cleanHost,
    kind: "custom",
    status: "pending",
    target: settings.workspaceHost,
    https: "pending",
    records: [
      {
        type: "CNAME",
        name: cleanHost,
        value: settings.workspaceHost,
        status: "pending",
        purpose: "Routes the custom domain to the Nova workspace edge",
      },
      {
        type: "TXT",
        name: `_nova-domain.${cleanHost}`,
        value: `nova-domain=${settings.workspaceId}`,
        status: "pending",
        purpose: "Proves domain ownership before activation",
      },
    ],
  };
}
