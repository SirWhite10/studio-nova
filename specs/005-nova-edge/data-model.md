# Nova Edge — Data Model (Rust)

## SurrealDB Tables

Same schema as existing `nova-domain-control`. Nova Edge is now the primary writer.

### `workspace_proxy`

| Field        | Type    | Description                           |
| ------------ | ------- | ------------------------------------- |
| id           | record  | `workspace_proxy:<proxy_name>`        |
| userId       | string  | Owner user ID                         |
| studioId     | string  | Studio/workspace ID                   |
| runtimeId    | string? | Runtime instance ID                   |
| proxyName    | string  | Unique proxy name                     |
| proxyType    | string  | `"http"`, `"https"`, `"tcp"`, `"udp"` |
| localIP      | string  | Target IP behind frpc                 |
| localPort    | number  | Target port behind frpc               |
| remotePort   | number? | Remote port (TCP/UDP)                 |
| frpcClientId | string? | FRP client identifier                 |
| enabled      | bool    | Whether proxy is active               |
| createdAt    | number  | Unix ms                               |
| updatedAt    | number  | Unix ms                               |

### `proxy_domain`

| Field             | Type    | Description                                        |
| ----------------- | ------- | -------------------------------------------------- |
| id                | record  | `proxy_domain:<normalized_host>`                   |
| host              | string  | Domain hostname                                    |
| proxyId           | string  | Ref to workspace_proxy                             |
| kind              | string  | `"subdomain"` or `"custom"`                        |
| status            | string  | `"pending"`, `"verified"`, `"active"`, `"blocked"` |
| verificationToken | string? | TXT verification token                             |
| createdAt         | number  | Unix ms                                            |
| updatedAt         | number  | Unix ms                                            |

### `frp_client`

| Field           | Type    | Description                     |
| --------------- | ------- | ------------------------------- |
| id              | record  | `frp_client:<client_id>`        |
| clientId        | string  | Unique client ID                |
| clusterId       | string? | K8s cluster ID                  |
| status          | string  | `"connected"`, `"disconnected"` |
| lastHeartbeatAt | number? | Unix ms                         |
| metadata        | object? | Client metadata                 |

### `tunnel_credentials` (new — per-client auth)

| Field     | Type   | Description                      |
| --------- | ------ | -------------------------------- |
| id        | record | `tunnel_credentials:<client_id>` |
| clientId  | string | Unique client ID                 |
| studioId  | string | Owning studio                    |
| secret    | string | Client secret (hashed)           |
| enabled   | bool   | Whether credentials are active   |
| createdAt | number | Unix ms                          |


### `tls_certificate` (new — ACME cert metadata)

| Field          | Type    | Description                                      |
| -------------- | ------- | ------------------------------------------------ |
| id             | record  | `tls_certificate:<normalized_host>`              |
| host           | string  | Domain hostname                                  |
| status         | string  | `"missing"`, `"provisioning"`, `"active"`, `"renewing"`, `"failed"`, `"degraded"` |
| source         | string  | `"acme"`, `"self_signed"`, `"imported"`          |
| issuer         | string? | Certificate issuer                               |
| serialNumber   | string? | Certificate serial number                        |
| notBefore      | number? | Unix ms                                          |
| notAfter       | number? | Unix ms                                          |
| lastAttemptAt  | number? | Last ACME attempt timestamp                      |
| lastSuccessAt  | number? | Last successful obtain/renew timestamp           |
| failureReason  | string? | Last ACME failure reason                         |
| instanceId     | string? | Edge instance that last touched the cert         |
| updatedAt      | number  | Unix ms                                          |

## Rust Types

### Core Types

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceProxy {
    pub id: Option<surrealdb::sql::Thing>,
    pub user_id: String,
    pub studio_id: String,
    pub runtime_id: Option<String>,
    pub proxy_name: String,
    pub proxy_type: ProxyType,
    pub local_ip: String,
    pub local_port: u16,
    pub remote_port: Option<u16>,
    pub frpc_client_id: Option<String>,
    pub enabled: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProxyType {
    Http,
    Https,
    Tcp,
    Udp,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyDomain {
    pub id: Option<surrealdb::sql::Thing>,
    pub host: String,
    pub proxy_id: String,
    pub kind: DomainKind,
    pub status: DomainStatus,
    pub verification_token: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DomainKind {
    Subdomain,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DomainStatus {
    Pending,
    Verified,
    Active,
    Blocked,
}

#[derive(Debug, Clone)]
pub struct DomainResolution {
    pub proxy: WorkspaceProxy,
    pub domain: ProxyDomain,
}
```

### API Types

```rust
#[derive(Debug, Deserialize)]
pub struct ProxyUpsertInput {
    pub user_id: String,
    pub studio_id: String,
    pub runtime_id: Option<String>,
    pub proxy_name: String,
    pub proxy_type: Option<ProxyType>,
    pub local_ip: Option<String>,
    pub local_port: u16,
    pub remote_port: Option<u16>,
    pub frpc_client_id: Option<String>,
    pub enabled: Option<bool>,
    pub subdomain: Option<String>,
    pub custom_domains: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct VerificationDetails {
    pub host: String,
    pub record_name: String,
    pub expected_value: String,
    pub found_values: Vec<String>,
    pub verified: bool,
}

#[derive(Debug, Clone)]
pub struct ProxyResolution {
    pub proxy_id: String,
    pub proxy_name: String,
    pub local_ip: String,
    pub local_port: u16,
    pub enabled: bool,
    pub host: String,
    pub kind: DomainKind,
}
```

### FRP Protocol Types

```rust
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum FrpMessage {
    #[serde(rename = "Login")]
    Login {
        version: String,
        hostname: Option<String>,
        os: String,
        arch: String,
        user: String,
        #[serde(rename = "meta")]
        metas: Option<FrpMetas>,
        run_id: Option<String>,
        pool_count: Option<u32>,
    },
    #[serde(rename = "NewProxy")]
    NewProxy {
        proxy_name: String,
        proxy_type: String,
        use_encryption: Option<bool>,
        use_compression: Option<bool>,
        bandwidth_limit: Option<String>,
        group: Option<String>,
        group_key: Option<String>,
        #[serde(flatten)]
        extra: serde_json::Map<String, serde_json::Value>,
    },
    #[serde(rename = "NewWorkConn")]
    NewWorkConn { run_id: Option<String> },
    #[serde(rename = "CloseProxy")]
    CloseProxy { proxy_name: String },
    #[serde(rename = "Heartbeat")]
    Heartbeat {},
    #[serde(rename = "ReqWorkConn")]
    ReqWorkConn { run_id: Option<String> },
    #[serde(rename = "StartWorkConn")]
    StartWorkConn { run_id: Option<String> },
    #[serde(rename = "NewProxyResp")]
    NewProxyResp {
        proxy_name: String,
        #[serde(rename = "error")]
        error_msg: Option<String>,
    },
    #[serde(rename = "LoginResp")]
    LoginResp {
        version: Option<String>,
        run_id: Option<String>,
        #[serde(rename = "error")]
        error_msg: Option<String>,
    },
}
```

### Analytics Types

```rust
#[derive(Debug, Serialize)]
pub struct RequestLog {
    pub timestamp: i64,
    pub host: String,
    pub path: String,
    pub method: String,
    pub status_code: u16,
    pub latency_ms: u32,
    pub tunnel_id: Option<String>,
    pub proxy_name: Option<String>,
    pub client_ip: String,
    pub instance_id: String,
    pub cache_hit: bool,
    pub compressed: bool,
}

#[derive(Debug, Serialize)]
pub struct TunnelEvent {
    pub timestamp: i64,
    pub event_type: TunnelEventType,
    pub client_id: String,
    pub tunnel_id: String,
    pub proxy_name: Option<String>,
    pub instance_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TunnelEventType {
    Connect,
    Disconnect,
    ProxyRegister,
    ProxyUnregister,
}
```

### Webhook Types

```rust
#[derive(Debug, Serialize)]
pub struct WebhookEvent {
    pub event: String,
    pub timestamp: i64,
    pub data: serde_json::Value,
    pub instance_id: String,
}

// Event names:
// "domain.activated"
// "domain.deactivated"
// "domain.verified"
// "cert.obtained"
// "cert.renewed"
// "cert.failed"
// "tunnel.connected"
// "tunnel.disconnected"
// "proxy.registered"
// "proxy.disabled"
// "rate_limit.exceeded"
// "circuit_breaker.tripped"
// "circuit_breaker.reset"
// "bot_challenge.served"
```

## ClickHouse Tables

```sql
CREATE TABLE IF NOT EXISTS request_log (
    timestamp DateTime64(3),
    host String,
    path String,
    method String,
    status_code UInt16,
    latency_ms UInt32,
    tunnel_id Nullable(String),
    proxy_name Nullable(String),
    client_ip String,
    instance_id String,
    cache_hit UInt8,
    compressed UInt8
) ENGINE = MergeTree()
ORDER BY (host, timestamp);

CREATE TABLE IF NOT EXISTS tunnel_event (
    timestamp DateTime64(3),
    event_type String,
    client_id String,
    tunnel_id String,
    proxy_name Nullable(String),
    instance_id String
) ENGINE = MergeTree()
ORDER BY (client_id, timestamp);
```

### TLS Certificate Types

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TlsCertificate {
    pub id: Option<serde_json::Value>,
    pub host: String,
    pub status: CertStatus,
    pub source: CertSource,
    pub issuer: Option<String>,
    pub serial_number: Option<String>,
    pub not_before: Option<i64>,
    pub not_after: Option<i64>,
    pub last_attempt_at: Option<i64>,
    pub last_success_at: Option<i64>,
    pub failure_reason: Option<String>,
    pub instance_id: Option<String>,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CertStatus { Missing, Provisioning, Active, Renewing, Failed, Degraded }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CertSource { Acme, SelfSigned, Imported }
```
