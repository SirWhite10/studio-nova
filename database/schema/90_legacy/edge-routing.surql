-- Exact 2026-07-13 live baseline for Nova Edge and FRP compatibility.
DEFINE TABLE frp_client TYPE ANY SCHEMALESS PERMISSIONS NONE;
DEFINE FIELD clientId ON frp_client TYPE string PERMISSIONS FULL;
DEFINE FIELD clusterId ON frp_client TYPE none | string PERMISSIONS FULL;
DEFINE FIELD lastHeartbeatAt ON frp_client TYPE none | number PERMISSIONS FULL;
DEFINE FIELD metadata ON frp_client TYPE none | object PERMISSIONS FULL;
DEFINE FIELD status ON frp_client TYPE string PERMISSIONS FULL;
DEFINE INDEX idx_frp_client_client ON frp_client FIELDS clientId UNIQUE;

DEFINE TABLE proxy_domain TYPE ANY SCHEMALESS PERMISSIONS NONE;
DEFINE FIELD createdAt ON proxy_domain TYPE number PERMISSIONS FULL;
DEFINE FIELD host ON proxy_domain TYPE string PERMISSIONS FULL;
DEFINE FIELD kind ON proxy_domain TYPE string PERMISSIONS FULL;
DEFINE FIELD proxyId ON proxy_domain TYPE string PERMISSIONS FULL;
DEFINE FIELD status ON proxy_domain TYPE string PERMISSIONS FULL;
DEFINE FIELD updatedAt ON proxy_domain TYPE number PERMISSIONS FULL;
DEFINE FIELD verificationToken ON proxy_domain TYPE none | string PERMISSIONS FULL;
DEFINE INDEX idx_proxy_domain_host ON proxy_domain FIELDS host UNIQUE;
DEFINE INDEX idx_proxy_domain_proxy ON proxy_domain FIELDS proxyId;

DEFINE TABLE workspace_proxy TYPE ANY SCHEMALESS PERMISSIONS NONE;
DEFINE FIELD createdAt ON workspace_proxy TYPE number PERMISSIONS FULL;
DEFINE FIELD enabled ON workspace_proxy TYPE bool DEFAULT true PERMISSIONS FULL;
DEFINE FIELD frpcClientId ON workspace_proxy TYPE none | string PERMISSIONS FULL;
DEFINE FIELD localIP ON workspace_proxy TYPE string DEFAULT '127.0.0.1' PERMISSIONS FULL;
DEFINE FIELD localPort ON workspace_proxy TYPE number PERMISSIONS FULL;
DEFINE FIELD proxyName ON workspace_proxy TYPE string PERMISSIONS FULL;
DEFINE FIELD proxyType ON workspace_proxy TYPE string PERMISSIONS FULL;
DEFINE FIELD remotePort ON workspace_proxy TYPE none | number PERMISSIONS FULL;
DEFINE FIELD runtimeId ON workspace_proxy TYPE none | string PERMISSIONS FULL;
DEFINE FIELD studioId ON workspace_proxy TYPE string PERMISSIONS FULL;
DEFINE FIELD updatedAt ON workspace_proxy TYPE number PERMISSIONS FULL;
DEFINE FIELD userId ON workspace_proxy TYPE string PERMISSIONS FULL;
DEFINE INDEX idx_workspace_proxy_name ON workspace_proxy FIELDS proxyName UNIQUE;
DEFINE INDEX idx_workspace_proxy_studio ON workspace_proxy FIELDS studioId;
