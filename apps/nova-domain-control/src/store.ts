import { StringRecordId, Surreal, Table } from "surrealdb";
import { generatedHost, isReservedCustomDomain, normalizeHost, validateHost } from "./domain.ts";
import type {
  DomainResolution,
  DomainStatus,
  ProxyDomain,
  ProxyUpsertInput,
  WorkspaceProxy,
} from "./types.ts";
import { generateVerificationToken } from "./verification.ts";

export interface DomainStore {
  ensureSchema(): Promise<void>;
  health(): Promise<{ ok: boolean; status: string }>;
  resolveHost(host: string): Promise<DomainResolution | null>;
  getDomainByHost(host: string): Promise<DomainResolution | null>;
  listDomainsForStudio(studioId: string): Promise<DomainResolution[]>;
  getProxyByName(proxyName: string): Promise<WorkspaceProxy | null>;
  listProxyDomains(proxyName: string): Promise<DomainResolution[]>;
  upsertProxy(input: ProxyUpsertInput, subdomainHost: string): Promise<DomainResolution[]>;
  setDomainStatus(host: string, status: DomainStatus): Promise<DomainResolution | null>;
  removeDomain(host: string, studioId?: string): Promise<boolean>;
  disableProxy(proxyName: string): Promise<void>;
}

const TABLE_DEFINITIONS = [
  "DEFINE TABLE IF NOT EXISTS workspace_proxy SCHEMALESS",
  "DEFINE FIELD IF NOT EXISTS userId ON workspace_proxy TYPE string",
  "DEFINE FIELD IF NOT EXISTS studioId ON workspace_proxy TYPE string",
  "DEFINE FIELD IF NOT EXISTS runtimeId ON workspace_proxy TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS proxyName ON workspace_proxy TYPE string",
  "DEFINE FIELD IF NOT EXISTS proxyType ON workspace_proxy TYPE string",
  "DEFINE FIELD IF NOT EXISTS localIP ON workspace_proxy TYPE string DEFAULT '127.0.0.1'",
  "DEFINE FIELD IF NOT EXISTS localPort ON workspace_proxy TYPE number",
  "DEFINE FIELD IF NOT EXISTS remotePort ON workspace_proxy TYPE option<number>",
  "DEFINE FIELD IF NOT EXISTS frpcClientId ON workspace_proxy TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS enabled ON workspace_proxy TYPE bool DEFAULT true",
  "DEFINE FIELD IF NOT EXISTS createdAt ON workspace_proxy TYPE number",
  "DEFINE FIELD IF NOT EXISTS updatedAt ON workspace_proxy TYPE number",
  "DEFINE INDEX IF NOT EXISTS idx_workspace_proxy_studio ON workspace_proxy FIELDS studioId",
  "DEFINE INDEX IF NOT EXISTS idx_workspace_proxy_name ON workspace_proxy FIELDS proxyName UNIQUE",
  "DEFINE TABLE IF NOT EXISTS proxy_domain SCHEMALESS",
  "DEFINE FIELD IF NOT EXISTS host ON proxy_domain TYPE string",
  "DEFINE FIELD IF NOT EXISTS proxyId ON proxy_domain TYPE string",
  "DEFINE FIELD IF NOT EXISTS kind ON proxy_domain TYPE string",
  "DEFINE FIELD IF NOT EXISTS status ON proxy_domain TYPE string",
  "DEFINE FIELD IF NOT EXISTS verificationToken ON proxy_domain TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS createdAt ON proxy_domain TYPE number",
  "DEFINE FIELD IF NOT EXISTS updatedAt ON proxy_domain TYPE number",
  "DEFINE INDEX IF NOT EXISTS idx_proxy_domain_host ON proxy_domain FIELDS host UNIQUE",
  "DEFINE INDEX IF NOT EXISTS idx_proxy_domain_proxy ON proxy_domain FIELDS proxyId",
  "DEFINE TABLE IF NOT EXISTS frp_client SCHEMALESS",
  "DEFINE FIELD IF NOT EXISTS clientId ON frp_client TYPE string",
  "DEFINE FIELD IF NOT EXISTS clusterId ON frp_client TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS status ON frp_client TYPE string",
  "DEFINE FIELD IF NOT EXISTS lastHeartbeatAt ON frp_client TYPE option<number>",
  "DEFINE FIELD IF NOT EXISTS metadata ON frp_client TYPE option<object>",
  "DEFINE INDEX IF NOT EXISTS idx_frp_client_client ON frp_client FIELDS clientId UNIQUE",
];

function recordIdToString(id: unknown) {
  if (typeof id === "string") return id;
  if (id && typeof id === "object" && "tb" in id && "id" in id) {
    const record = id as { tb: string; id: { toString(): string } };
    return `${record.tb}:${record.id.toString()}`;
  }
  return String(id);
}

function withRecordId<T extends { id?: unknown }>(row: T): T & { _id: string } {
  return { ...row, _id: recordIdToString(row.id) };
}

async function queryRows<T>(db: Surreal, sql: string, vars: Record<string, unknown> = {}) {
  const result = await db.query<T[][]>(sql, vars).collect();
  return (result[0] ?? []) as T[];
}

async function connectWithTimeout(
  db: Surreal,
  config: {
    url: string;
    namespace: string;
    database: string;
    username: string;
    password: string;
    connectTimeoutMs: number;
  },
) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const connection = (async () => {
    await db.connect(config.url, {
      namespace: config.namespace,
      database: config.database,
      authentication: {
        username: config.username,
        password: config.password,
      },
    });
    await db.ready;
  })();

  try {
    await Promise.race([
      connection,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`SurrealDB connection timed out after ${config.connectTimeoutMs}ms`));
        }, config.connectTimeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export class SurrealDomainStore implements DomainStore {
  private db: Surreal | null = null;
  private connectPromise: Promise<Surreal> | null = null;
  private readonly config: {
    url: string;
    namespace: string;
    database: string;
    username: string;
    password: string;
    connectTimeoutMs: number;
  };

  constructor(config: SurrealDomainStore["config"]) {
    this.config = config;
  }

  private async getDb() {
    if (this.db?.status === "connected") return this.db;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = (async () => {
      const db = new Surreal();
      await connectWithTimeout(db, this.config);
      this.db = db;
      return db;
    })();

    try {
      return await this.connectPromise;
    } catch (error) {
      this.db = null;
      this.connectPromise = null;
      throw error;
    }
  }

  async ensureSchema() {
    const db = await this.getDb();
    for (const ddl of TABLE_DEFINITIONS) {
      await db.query(ddl).collect();
    }
  }

  async health() {
    try {
      const db = await this.getDb();
      return { ok: db.status === "connected", status: db.status };
    } catch (error) {
      return { ok: false, status: error instanceof Error ? error.message : String(error) };
    }
  }

  async resolveHost(host: string) {
    const safeHost = validateHost(host);
    if (!safeHost.ok) return null;

    const db = await this.getDb();
    const rows = await queryRows<ProxyDomain>(
      db,
      "SELECT * FROM proxy_domain WHERE host = $host AND status = 'active' LIMIT 1",
      { host: safeHost.host },
    );
    const domain = rows[0];
    if (!domain) return null;

    const selected = await db.select<WorkspaceProxy>(new StringRecordId(domain.proxyId));
    const proxy = Array.isArray(selected) ? selected[0] : selected;
    if (!proxy?.enabled) return null;

    return {
      proxy: withRecordId(proxy),
      domain: withRecordId(domain),
    };
  }

  async getDomainByHost(host: string) {
    const safeHost = validateHost(host);
    if (!safeHost.ok) return null;

    const db = await this.getDb();
    const rows = await queryRows<ProxyDomain>(
      db,
      "SELECT * FROM proxy_domain WHERE host = $host LIMIT 1",
      { host: safeHost.host },
    );
    const domain = rows[0];
    if (!domain) return null;

    const selected = await db.select<WorkspaceProxy>(new StringRecordId(domain.proxyId));
    const proxy = Array.isArray(selected) ? selected[0] : selected;
    if (!proxy) return null;

    return {
      proxy: withRecordId(proxy),
      domain: withRecordId(domain),
    };
  }

  async getProxyByName(proxyName: string) {
    const db = await this.getDb();
    const rows = await queryRows<WorkspaceProxy>(
      db,
      "SELECT * FROM workspace_proxy WHERE proxyName = $proxyName AND enabled = true LIMIT 1",
      { proxyName },
    );
    return rows[0] ? withRecordId(rows[0]) : null;
  }

  async listProxyDomains(proxyName: string) {
    const db = await this.getDb();
    const proxies = await queryRows<WorkspaceProxy>(
      db,
      "SELECT * FROM workspace_proxy WHERE proxyName = $proxyName LIMIT 1",
      { proxyName },
    );
    const proxy = proxies[0];
    if (!proxy) return [];

    const proxyRow = withRecordId(proxy);
    const rows = await queryRows<ProxyDomain>(
      db,
      "SELECT * FROM proxy_domain WHERE proxyId = $proxyId",
      { proxyId: proxyRow._id },
    );
    return rows.map((domain) => ({
      proxy: proxyRow,
      domain: withRecordId(domain),
    }));
  }

  async listDomainsForStudio(studioId: string) {
    const db = await this.getDb();
    const proxies = await queryRows<WorkspaceProxy>(
      db,
      "SELECT * FROM workspace_proxy WHERE studioId = $studioId ORDER BY updatedAt DESC",
      { studioId },
    );
    const resolutions: DomainResolution[] = [];
    for (const proxy of proxies) {
      const proxyRow = withRecordId(proxy);
      const domains = await queryRows<ProxyDomain>(
        db,
        "SELECT * FROM proxy_domain WHERE proxyId = $proxyId ORDER BY updatedAt DESC",
        { proxyId: proxyRow._id },
      );
      for (const domain of domains) {
        resolutions.push({
          proxy: proxyRow,
          domain: withRecordId(domain),
        });
      }
    }
    return resolutions;
  }

  async upsertProxy(input: ProxyUpsertInput, subdomainHost: string) {
    const db = await this.getDb();
    const now = Date.now();
    const existing = await queryRows<WorkspaceProxy>(
      db,
      "SELECT * FROM workspace_proxy WHERE proxyName = $proxyName LIMIT 1",
      { proxyName: input.proxyName },
    );

    const content = {
      userId: input.userId,
      studioId: input.studioId,
      runtimeId: input.runtimeId,
      proxyName: input.proxyName,
      proxyType: input.proxyType ?? "http",
      localIP: input.localIP ?? "127.0.0.1",
      localPort: input.localPort,
      remotePort: input.remotePort,
      frpcClientId: input.frpcClientId,
      enabled: input.enabled ?? true,
      updatedAt: now,
    };

    const proxy = existing[0]
      ? await db
          .update<WorkspaceProxy>(new StringRecordId(recordIdToString(existing[0].id)))
          .merge(content)
      : await db.create(new Table("workspace_proxy")).content({ ...content, createdAt: now });
    const proxyRow = withRecordId((Array.isArray(proxy) ? proxy[0] : proxy) as WorkspaceProxy);

    const hosts = new Map<string, { host: string; kind: "subdomain" | "custom" }>();
    if (input.subdomain) {
      const host = generatedHost(input.subdomain, subdomainHost);
      hosts.set(host, { host, kind: "subdomain" });
    }
    for (const customDomain of input.customDomains ?? []) {
      const safeHost = validateHost(customDomain);
      if (!safeHost.ok) throw new Error(safeHost.error);
      if (isReservedCustomDomain(safeHost.host, subdomainHost)) {
        throw new Error(`Custom domain cannot be under ${subdomainHost}`);
      }
      hosts.set(safeHost.host, { host: safeHost.host, kind: "custom" });
    }

    const resolutions: DomainResolution[] = [];
    for (const domain of hosts.values()) {
      const domainRows = await queryRows<ProxyDomain>(
        db,
        "SELECT * FROM proxy_domain WHERE host = $host LIMIT 1",
        { host: domain.host },
      );
      const existingDomain = domainRows[0];
      const status: DomainStatus =
        domain.kind === "subdomain" ? "active" : (existingDomain?.status ?? "pending");
      const domainContent: {
        host: string;
        proxyId: string;
        kind: "subdomain" | "custom";
        status: DomainStatus;
        verificationToken?: string;
        updatedAt: number;
      } = {
        host: domain.host,
        proxyId: proxyRow._id,
        kind: domain.kind,
        status,
        updatedAt: now,
      };
      if (domain.kind === "custom") {
        domainContent.verificationToken =
          existingDomain?.verificationToken ?? generateVerificationToken();
      }
      const savedDomain = existingDomain
        ? await db
            .update<ProxyDomain>(new StringRecordId(recordIdToString(existingDomain.id)))
            .merge(domainContent)
        : await db.create(new Table("proxy_domain")).content({ ...domainContent, createdAt: now });
      resolutions.push({
        proxy: proxyRow,
        domain: withRecordId(
          (Array.isArray(savedDomain) ? savedDomain[0] : savedDomain) as ProxyDomain,
        ),
      });
    }

    return resolutions;
  }

  async setDomainStatus(host: string, status: DomainStatus) {
    const db = await this.getDb();
    const safeHost = validateHost(host);
    if (!safeHost.ok) return null;
    const rows = await queryRows<ProxyDomain>(
      db,
      "SELECT * FROM proxy_domain WHERE host = $host LIMIT 1",
      { host: safeHost.host },
    );
    const domain = rows[0];
    if (!domain) return null;

    await db
      .update<ProxyDomain>(new StringRecordId(recordIdToString(domain.id)))
      .merge({ status, updatedAt: Date.now() });
    return this.getDomainByHost(safeHost.host);
  }

  async removeDomain(host: string, studioId?: string) {
    const db = await this.getDb();
    const safeHost = validateHost(host);
    if (!safeHost.ok) return false;
    const rows = await queryRows<ProxyDomain>(
      db,
      "SELECT * FROM proxy_domain WHERE host = $host LIMIT 1",
      { host: safeHost.host },
    );
    const domain = rows[0];
    if (!domain) return false;

    if (studioId) {
      const selected = await db.select<WorkspaceProxy>(new StringRecordId(domain.proxyId));
      const proxy = Array.isArray(selected) ? selected[0] : selected;
      if (!proxy || proxy.studioId !== studioId) return false;
    }

    await db.delete(new StringRecordId(recordIdToString(domain.id)));
    return true;
  }

  async disableProxy(proxyName: string) {
    const db = await this.getDb();
    await db.query(
      "UPDATE workspace_proxy SET enabled = false, updatedAt = $now WHERE proxyName = $proxyName",
      { proxyName, now: Date.now() },
    );
  }
}

export class MemoryDomainStore implements DomainStore {
  private proxies = new Map<string, WorkspaceProxy & { _id: string }>();
  private domains = new Map<string, ProxyDomain & { _id: string }>();

  async ensureSchema() {}

  async health() {
    return { ok: true, status: "memory" };
  }

  async resolveHost(host: string) {
    const safeHost = normalizeHost(host);
    const domain = this.domains.get(safeHost);
    if (!domain || domain.status !== "active") return null;
    const proxy = [...this.proxies.values()].find((candidate) => candidate._id === domain.proxyId);
    if (!proxy || !proxy.enabled) return null;
    return { proxy, domain };
  }

  async getDomainByHost(host: string) {
    const safeHost = normalizeHost(host);
    const domain = this.domains.get(safeHost);
    if (!domain) return null;
    const proxy = [...this.proxies.values()].find((candidate) => candidate._id === domain.proxyId);
    if (!proxy) return null;
    return { proxy, domain };
  }

  async getProxyByName(proxyName: string) {
    return this.proxies.get(proxyName) ?? null;
  }

  async listDomainsForStudio(studioId: string): Promise<DomainResolution[]> {
    const resolutions: DomainResolution[] = [];
    for (const domain of this.domains.values()) {
      const proxy = [...this.proxies.values()].find(
        (candidate) => candidate._id === domain.proxyId,
      );
      if (proxy?.studioId === studioId) {
        resolutions.push({ proxy, domain });
      }
    }
    return resolutions;
  }

  async listProxyDomains(proxyName: string) {
    const proxy = this.proxies.get(proxyName);
    if (!proxy) return [];
    return [...this.domains.values()]
      .filter((domain) => domain.proxyId === proxy._id)
      .map((domain) => ({ proxy, domain }));
  }

  async upsertProxy(input: ProxyUpsertInput, subdomainHost: string) {
    const now = Date.now();
    const existing = this.proxies.get(input.proxyName);
    const proxy: WorkspaceProxy & { _id: string } = {
      _id: existing?._id ?? `workspace_proxy:${input.proxyName}`,
      userId: input.userId,
      studioId: input.studioId,
      runtimeId: input.runtimeId,
      proxyName: input.proxyName,
      proxyType: input.proxyType ?? "http",
      localIP: input.localIP ?? "127.0.0.1",
      localPort: input.localPort,
      remotePort: input.remotePort,
      frpcClientId: input.frpcClientId,
      enabled: input.enabled ?? true,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.proxies.set(proxy.proxyName, proxy);

    const hosts = new Map<string, { host: string; kind: "subdomain" | "custom" }>();
    if (input.subdomain) {
      const host = generatedHost(input.subdomain, subdomainHost);
      hosts.set(host, { host, kind: "subdomain" });
    }
    for (const customDomain of input.customDomains ?? []) {
      const safeHost = validateHost(customDomain);
      if (!safeHost.ok) throw new Error(safeHost.error);
      if (isReservedCustomDomain(safeHost.host, subdomainHost)) {
        throw new Error(`Custom domain cannot be under ${subdomainHost}`);
      }
      hosts.set(safeHost.host, { host: safeHost.host, kind: "custom" });
    }

    const resolutions: DomainResolution[] = [];
    for (const value of hosts.values()) {
      const existingDomain = this.domains.get(value.host);
      const domain: ProxyDomain & { _id: string } = {
        _id: existingDomain?._id ?? `proxy_domain:${value.host}`,
        host: value.host,
        proxyId: proxy._id,
        kind: value.kind,
        status: value.kind === "subdomain" ? "active" : (existingDomain?.status ?? "pending"),
        createdAt: existingDomain?.createdAt ?? now,
        updatedAt: now,
      };
      if (value.kind === "custom") {
        domain.verificationToken = existingDomain?.verificationToken ?? generateVerificationToken();
      }
      this.domains.set(domain.host, domain);
      resolutions.push({ proxy, domain });
    }
    return resolutions;
  }

  async setDomainStatus(host: string, status: DomainStatus) {
    const domain = this.domains.get(normalizeHost(host));
    if (!domain) return null;
    domain.status = status;
    domain.updatedAt = Date.now();
    return this.getDomainByHost(domain.host);
  }

  async removeDomain(host: string, studioId?: string) {
    const safeHost = normalizeHost(host);
    const domain = this.domains.get(safeHost);
    if (!domain) return false;
    if (studioId) {
      const proxy = [...this.proxies.values()].find(
        (candidate) => candidate._id === domain.proxyId,
      );
      if (!proxy || proxy.studioId !== studioId) return false;
    }
    this.domains.delete(safeHost);
    return true;
  }

  async disableProxy(proxyName: string) {
    const proxy = this.proxies.get(proxyName);
    if (proxy) {
      proxy.enabled = false;
      proxy.updatedAt = Date.now();
    }
  }
}
