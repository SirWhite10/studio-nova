-- ============================================================================
-- Studio Nova Domain Preset Schema
-- ============================================================================
--
-- This file contains all SurrealQL DDL statements for the Studio Nova
-- domain/proxy data model. It is applied on first startup or when the
-- schema checksum changes.
--
-- Tables:
--   workspace_proxy  — Workspace proxy tunnel records
--   proxy_domain     — Domain names attached to proxies
--
-- Maintained by: edge-store/src/schema/mod.rs (SchemaManager)
-- ============================================================================

-- ── workspace_proxy table ───────────────────────────────────────────────────

DEFINE TABLE IF NOT EXISTS workspace_proxy SCHEMALESS;

-- Fields

DEFINE FIELD IF NOT EXISTS userId ON workspace_proxy TYPE string;
DEFINE FIELD IF NOT EXISTS studioId ON workspace_proxy TYPE string;
DEFINE FIELD IF NOT EXISTS runtimeId ON workspace_proxy TYPE option<string>;
DEFINE FIELD IF NOT EXISTS proxyName ON workspace_proxy TYPE string;
DEFINE FIELD IF NOT EXISTS proxyType ON workspace_proxy TYPE string;
DEFINE FIELD IF NOT EXISTS localIP ON workspace_proxy TYPE string DEFAULT '127.0.0.1';
DEFINE FIELD IF NOT EXISTS localPort ON workspace_proxy TYPE number;
DEFINE FIELD IF NOT EXISTS remotePort ON workspace_proxy TYPE option<number>;
DEFINE FIELD IF NOT EXISTS frpcClientId ON workspace_proxy TYPE option<string>;
DEFINE FIELD IF NOT EXISTS enabled ON workspace_proxy TYPE bool DEFAULT true;
DEFINE FIELD IF NOT EXISTS createdAt ON workspace_proxy TYPE number;
DEFINE FIELD IF NOT EXISTS updatedAt ON workspace_proxy TYPE number;

-- Indexes

DEFINE INDEX IF NOT EXISTS idx_workspace_proxy_studio ON workspace_proxy FIELDS studioId;
DEFINE INDEX IF NOT EXISTS idx_workspace_proxy_name ON workspace_proxy FIELDS proxyName UNIQUE;

-- ── proxy_domain table ──────────────────────────────────────────────────────

DEFINE TABLE IF NOT EXISTS proxy_domain SCHEMALESS;

-- Fields

DEFINE FIELD IF NOT EXISTS host ON proxy_domain TYPE string;
DEFINE FIELD IF NOT EXISTS proxyId ON proxy_domain TYPE string;
DEFINE FIELD IF NOT EXISTS kind ON proxy_domain TYPE string;
DEFINE FIELD IF NOT EXISTS status ON proxy_domain TYPE string;
DEFINE FIELD IF NOT EXISTS verificationToken ON proxy_domain TYPE option<string>;
DEFINE FIELD IF NOT EXISTS createdAt ON proxy_domain TYPE number;
DEFINE FIELD IF NOT EXISTS updatedAt ON proxy_domain TYPE number;

-- Indexes

DEFINE INDEX IF NOT EXISTS idx_proxy_domain_host ON proxy_domain FIELDS host UNIQUE;
DEFINE INDEX IF NOT EXISTS idx_proxy_domain_proxy ON proxy_domain FIELDS proxyId;
