use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct ProxyUpsertRequest {
    pub user_id: String,
    pub studio_id: String,
    pub runtime_id: Option<String>,
    pub proxy_name: String,
    pub proxy_type: Option<String>,
    pub local_ip: Option<String>,
    pub local_port: u16,
    pub remote_port: Option<u16>,
    pub frpc_client_id: Option<String>,
    pub enabled: Option<bool>,
    pub subdomain: Option<String>,
    pub custom_domains: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct VerifyDomainRequest {
    pub host: String,
}

#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub ok: bool,
    #[serde(flatten)]
    pub data: T,
}
