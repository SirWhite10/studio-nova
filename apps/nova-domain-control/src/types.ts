export type ProxyType = "http" | "https" | "tcp" | "udp";
export type DomainKind = "subdomain" | "custom";
export type DomainStatus = "pending" | "verified" | "active" | "blocked";

export type WorkspaceProxy = {
  id?: unknown;
  _id?: string;
  userId: string;
  studioId: string;
  runtimeId?: string;
  proxyName: string;
  proxyType: ProxyType;
  localIP: string;
  localPort: number;
  remotePort?: number;
  frpcClientId?: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ProxyDomain = {
  id?: unknown;
  _id?: string;
  host: string;
  proxyId: string;
  kind: DomainKind;
  status: DomainStatus;
  verificationToken?: string;
  createdAt: number;
  updatedAt: number;
};

export type DomainResolution = {
  proxy: WorkspaceProxy;
  domain: ProxyDomain;
};

export type ProxyUpsertInput = {
  userId: string;
  studioId: string;
  runtimeId?: string;
  proxyName: string;
  proxyType?: ProxyType;
  localIP?: string;
  localPort: number;
  remotePort?: number;
  frpcClientId?: string;
  enabled?: boolean;
  subdomain?: string;
  customDomains?: string[];
};

export type FrpPluginResponse = {
  reject: boolean;
  rejectReason?: string;
  unchange?: boolean;
  content?: unknown;
};
