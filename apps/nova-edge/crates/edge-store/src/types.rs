use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceProxy {
    #[serde(skip_serializing_if = "Option::is_none")]
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
    #[serde(skip_serializing_if = "Option::is_none")]
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

#[derive(Debug, Clone)]
pub struct DomainResolution {
    pub proxy: WorkspaceProxy,
    pub domain: ProxyDomain,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct VerificationDetails {
    pub host: String,
    pub record_name: String,
    pub expected_value: String,
    pub found_values: Vec<String>,
    pub verified: bool,
}

#[derive(Debug, Serialize)]
pub struct StoreHealth {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}
