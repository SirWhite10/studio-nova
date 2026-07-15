use serde::{Deserialize, Serialize};

// ── Core Types ──────────────────────────────────────────────────────
// Field naming uses camelCase to match existing SurrealDB data written
// by nova-domain-control (TypeScript).  Every serialisable struct that
// talks to SurrealDB must use `rename_all = "camelCase"`.

/// A workspace proxy record.  Maps to the `workspace_proxy` SurrealDB table.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceProxy {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<serde_json::Value>,
    pub user_id: String,
    pub studio_id: String,
    pub runtime_id: Option<String>,
    pub proxy_name: String,
    pub proxy_type: ProxyType,
    #[serde(rename = "localIP")]
    pub local_ip: String,
    pub local_port: u16,
    pub remote_port: Option<u16>,
    pub frpc_client_id: Option<String>,
    pub enabled: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DomainKind {
    Subdomain,
    Custom,
}

impl DomainKind {
    /// The initial status for a domain of this kind when first created.
    /// Subdomains auto-activate; custom domains require verification.
    pub fn initial_status(&self) -> DomainStatus {
        match self {
            Self::Subdomain => DomainStatus::Active,
            Self::Custom => DomainStatus::Pending,
        }
    }
}

impl std::fmt::Display for DomainKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Subdomain => write!(f, "subdomain"),
            Self::Custom => write!(f, "custom"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProxyType {
    Http,
    Https,
    Tcp,
    Udp,
}

impl std::fmt::Display for ProxyType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Http => write!(f, "http"),
            Self::Https => write!(f, "https"),
            Self::Tcp => write!(f, "tcp"),
            Self::Udp => write!(f, "udp"),
        }
    }
}

impl Default for ProxyType {
    fn default() -> Self {
        Self::Http
    }
}

/// A domain attached to a proxy.  Maps to the `proxy_domain` SurrealDB table.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProxyDomain {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<serde_json::Value>,
    pub host: String,
    pub proxy_id: String,
    pub kind: DomainKind,
    pub status: DomainStatus,
    pub verification_token: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DomainStatus {
    Pending,
    Verified,
    Active,
    Blocked,
}

impl std::fmt::Display for DomainStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Pending => write!(f, "pending"),
            Self::Verified => write!(f, "verified"),
            Self::Active => write!(f, "active"),
            Self::Blocked => write!(f, "blocked"),
        }
    }
}

impl std::str::FromStr for DomainStatus {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pending" => Ok(Self::Pending),
            "verified" => Ok(Self::Verified),
            "active" => Ok(Self::Active),
            "blocked" => Ok(Self::Blocked),
            other => Err(format!("unknown domain status: {other}")),
        }
    }
}

/// Combined proxy + domain for host resolution.
#[derive(Debug, Clone)]
pub struct DomainResolution {
    pub proxy: WorkspaceProxy,
    pub domain: ProxyDomain,
}

/// New-schema ownership data used by Horizon for DNS verification.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DomainBindingVerification {
    pub host: String,
    pub user_id: String,
    pub studio_id: String,
    pub ownership_status: String,
    pub certificate_status: String,
    pub verification_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EdgeRouteResolution {
    pub host: String,
    pub user_id: String,
    pub studio_id: String,
    pub proxy_name: String,
    #[serde(rename = "localIP")]
    pub local_ip: String,
    pub local_port: u16,
    pub deployment_id: Option<String>,
    pub runtime_instance_id: Option<String>,
    pub connector_key: Option<String>,
    pub horizon_node_id: Option<String>,
    pub legacy: bool,
}

/// Lightweight resolution used by the proxy layer.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProxyResolution {
    pub proxy_id: String,
    pub proxy_name: String,
    #[serde(rename = "localIP")]
    pub local_ip: String,
    pub local_port: u16,
    pub enabled: bool,
    pub host: String,
    pub kind: DomainKind,
}

/// API input for creating/updating a proxy + its domains.
#[derive(Debug, Clone, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
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

/// TXT verification result for a domain.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VerificationDetails {
    pub host: String,
    pub record_name: String,
    pub expected_value: String,
    pub found_values: Vec<String>,
    pub verified: bool,
}

/// Health check result for the store layer.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct StoreHealth {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

// ── Tests ───────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── WorkspaceProxy roundtrip ───────────────────────────────────

    #[test]
    fn proxy_serde_roundtrip() {
        let proxy = WorkspaceProxy {
            id: None,
            user_id: "user_123".into(),
            studio_id: "studio_abc".into(),
            runtime_id: Some("runtime_xyz".into()),
            proxy_name: "my-proxy".into(),
            proxy_type: ProxyType::Http,
            local_ip: "10.0.0.5".into(),
            local_port: 3000,
            remote_port: None,
            frpc_client_id: Some("client-1".into()),
            enabled: true,
            created_at: 1_700_000_000_000,
            updated_at: 1_700_000_000_000,
        };

        let json = serde_json::to_string(&proxy).unwrap();
        // Must be camelCase to match SurrealDB
        assert!(json.contains("\"userId\""), "userId not camelCase: {json}");
        assert!(
            json.contains("\"studioId\""),
            "studioId not camelCase: {json}"
        );
        assert!(
            json.contains("\"proxyName\""),
            "proxyName not camelCase: {json}"
        );
        assert!(
            json.contains("\"proxyType\""),
            "proxyType not camelCase: {json}"
        );
        assert!(
            json.contains("\"localIP\""),
            "localIP not camelCase: {json}"
        );
        assert!(
            json.contains("\"localPort\""),
            "localPort not camelCase: {json}"
        );
        assert!(
            json.contains("\"frpcClientId\""),
            "frpcClientId not camelCase: {json}"
        );
        assert!(
            json.contains("\"createdAt\""),
            "createdAt not camelCase: {json}"
        );
        assert!(
            json.contains("\"proxyType\":\"http\""),
            "proxyType not lowercase: {json}"
        );

        let back: WorkspaceProxy = serde_json::from_str(&json).unwrap();
        assert_eq!(proxy, back);
    }

    #[test]
    fn proxy_minimal_fields() {
        let proxy = WorkspaceProxy {
            id: None,
            user_id: "u1".into(),
            studio_id: "s1".into(),
            runtime_id: None,
            proxy_name: "p1".into(),
            proxy_type: ProxyType::Tcp,
            local_ip: "127.0.0.1".into(),
            local_port: 8080,
            remote_port: Some(9090),
            frpc_client_id: None,
            enabled: false,
            created_at: 0,
            updated_at: 0,
        };

        let json = serde_json::to_string(&proxy).unwrap();
        // Optional None fields should be present as null in JSON (serde default)
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert!(parsed["runtimeId"].is_null());
        assert!(parsed["frpcClientId"].is_null());
        assert_eq!(parsed["remotePort"], 9090);
        assert_eq!(parsed["proxyType"], "tcp");
    }

    // ── ProxyDomain roundtrip ──────────────────────────────────────

    #[test]
    fn domain_serde_roundtrip() {
        let domain = ProxyDomain {
            id: None,
            host: "example.com".into(),
            proxy_id: "workspace_proxy:my-proxy".into(),
            kind: DomainKind::Custom,
            status: DomainStatus::Active,
            verification_token: Some("nova-domain=abc123".into()),
            created_at: 1_700_000_000_000,
            updated_at: 1_700_000_000_000,
        };

        let json = serde_json::to_string(&domain).unwrap();
        assert!(
            json.contains("\"proxyId\""),
            "proxyId not camelCase: {json}"
        );
        assert!(
            json.contains("\"verificationToken\""),
            "verificationToken not camelCase: {json}"
        );
        assert!(
            json.contains("\"createdAt\""),
            "createdAt not camelCase: {json}"
        );
        assert!(
            json.contains("\"kind\":\"custom\""),
            "kind not lowercase: {json}"
        );
        assert!(
            json.contains("\"status\":\"active\""),
            "status not lowercase: {json}"
        );

        let back: ProxyDomain = serde_json::from_str(&json).unwrap();
        assert_eq!(domain, back);
    }

    // ── DomainStatus Display + FromStr ─────────────────────────────

    #[test]
    fn domain_status_display_and_parse() {
        assert_eq!(DomainStatus::Pending.to_string(), "pending");
        assert_eq!(DomainStatus::Verified.to_string(), "verified");
        assert_eq!(DomainStatus::Active.to_string(), "active");
        assert_eq!(DomainStatus::Blocked.to_string(), "blocked");

        assert_eq!(
            "active".parse::<DomainStatus>().unwrap(),
            DomainStatus::Active
        );
        assert!("unknown".parse::<DomainStatus>().is_err());
    }

    // ── ProxyUpsertInput roundtrip ─────────────────────────────────

    #[test]
    fn upsert_input_deserializes_camel_case() {
        let json = r#"{
            "userId": "u1",
            "studioId": "s1",
            "proxyName": "my-proxy",
            "localPort": 3000,
            "customDomains": ["one0.cloud", "test.one0.cloud"]
        }"#;

        let input: ProxyUpsertInput = serde_json::from_str(json).unwrap();
        assert_eq!(input.user_id, "u1");
        assert_eq!(input.studio_id, "s1");
        assert_eq!(input.proxy_name, "my-proxy");
        assert_eq!(input.local_port, 3000);
        assert_eq!(
            input.custom_domains.unwrap(),
            vec!["one0.cloud", "test.one0.cloud"]
        );
        assert!(input.runtime_id.is_none());
        assert!(input.proxy_type.is_none());
        assert!(input.enabled.is_none());
    }

    // ── VerificationDetails roundtrip ──────────────────────────────

    #[test]
    fn verification_details_roundtrip() {
        let details = VerificationDetails {
            host: "test.one0.cloud".into(),
            record_name: "_nova-domain.test.one0.cloud".into(),
            expected_value: "nova-domain=abc123".into(),
            found_values: vec!["nova-domain=abc123".into()],
            verified: true,
        };

        let json = serde_json::to_string(&details).unwrap();
        assert!(
            json.contains("\"recordName\""),
            "recordName not camelCase: {json}"
        );
        assert!(
            json.contains("\"expectedValue\""),
            "expectedValue not camelCase: {json}"
        );
        assert!(
            json.contains("\"foundValues\""),
            "foundValues not camelCase: {json}"
        );

        let back: VerificationDetails = serde_json::from_str(&json).unwrap();
        assert_eq!(details, back);
    }

    // ── StoreHealth ────────────────────────────────────────────────

    #[test]
    fn store_health_serializes() {
        let h = StoreHealth {
            ok: true,
            message: Some("connected".into()),
        };
        let json = serde_json::to_string(&h).unwrap();
        assert!(json.contains("\"ok\":true"));
        assert!(json.contains("\"message\":\"connected\""));

        let h2 = StoreHealth {
            ok: false,
            message: None,
        };
        let json2 = serde_json::to_string(&h2).unwrap();
        assert!(
            !json2.contains("message"),
            "message should be skipped when None"
        );
    }

    // ── ProxyResolution roundtrip ──────────────────────────────────

    #[test]
    fn proxy_resolution_roundtrip() {
        let pr = ProxyResolution {
            proxy_id: "workspace_proxy:my-proxy".into(),
            proxy_name: "my-proxy".into(),
            local_ip: "10.42.0.5".into(),
            local_port: 3000,
            enabled: true,
            host: "test.one0.cloud".into(),
            kind: DomainKind::Subdomain,
        };

        let json = serde_json::to_string(&pr).unwrap();
        assert!(json.contains("\"proxyId\""));
        assert!(json.contains("\"proxyName\""));
        assert!(json.contains("\"localIP\""));
        assert!(json.contains("\"localPort\""));

        let back: ProxyResolution = serde_json::from_str(&json).unwrap();
        assert_eq!(pr, back);
    }

    // ── Cross-compat: deserialize JSON that looks like SurrealDB output ─

    #[test]
    fn proxy_deserializes_surrealdb_style_json() {
        // This is what SurrealDB actually returns for a workspace_proxy record
        let json = r#"{
            "id": {"id": {"String": "my-proxy"}, "tb": "workspace_proxy"},
            "userId": "sir@dlxstudios.com",
            "studioId": "studio:1ea8zte8l59ca4iscfa3",
            "runtimeId": "runtime:abc",
            "proxyName": "one0-cloud-runtime",
            "proxyType": "http",
            "localIP": "10.42.0.79",
            "localPort": 3000,
            "remotePort": null,
            "frpcClientId": "k3s-localnova",
            "enabled": true,
            "createdAt": 1700000000000,
            "updatedAt": 1700000000000
        }"#;

        let proxy: WorkspaceProxy = serde_json::from_str(json).unwrap();
        assert_eq!(proxy.user_id, "sir@dlxstudios.com");
        assert_eq!(proxy.proxy_name, "one0-cloud-runtime");
        assert_eq!(proxy.proxy_type, ProxyType::Http);
        assert_eq!(proxy.local_ip, "10.42.0.79");
        assert_eq!(proxy.local_port, 3000);
        assert!(proxy.enabled);
        assert!(proxy.runtime_id.is_some());
        assert!(proxy.remote_port.is_none());
    }

    #[test]
    fn domain_deserializes_surrealdb_style_json() {
        let json = r#"{
            "id": {"id": {"String": "test-one0-cloud"}, "tb": "proxy_domain"},
            "host": "test.one0.cloud",
            "proxyId": "workspace_proxy:one0-cloud-runtime",
            "kind": "custom",
            "status": "active",
            "verificationToken": "nova-domain=abc123def456",
            "createdAt": 1700000000000,
            "updatedAt": 1700000000000
        }"#;

        let domain: ProxyDomain = serde_json::from_str(json).unwrap();
        assert_eq!(domain.host, "test.one0.cloud");
        assert_eq!(domain.proxy_id, "workspace_proxy:one0-cloud-runtime");
        assert_eq!(domain.kind, DomainKind::Custom);
        assert_eq!(domain.status, DomainStatus::Active);
        assert!(domain.verification_token.is_some());
    }
}
