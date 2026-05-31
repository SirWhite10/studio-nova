//! FRP protocol message types
//! TODO: implement Login, NewProxy, NewWorkConn, CloseProxy, Heartbeat with serde

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Login {
    pub version: String,
    pub hostname: String,
    pub run_id: String,
    pub pool_count: u32,
    pub token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewProxy {
    pub proxy_name: String,
    pub proxy_type: String,
    pub use_encryption: bool,
    pub use_compression: bool,
    pub custom_domains: Vec<String>,
    pub subdomain: String,
    pub locations: Vec<String>,
    pub host_header_rewrite: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewWorkConn {
    pub run_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CloseProxy {
    pub proxy_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Heartbeat {
    pub timestamp: i64,
}
