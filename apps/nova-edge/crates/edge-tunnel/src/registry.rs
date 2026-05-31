//! Active tunnel registry
//! TODO: track connected clients, their proxies, and connection state

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone)]
pub struct TunnelClient {
    pub run_id: String,
    pub proxy_names: Vec<String>,
}

pub struct TunnelRegistry {
    clients: RwLock<HashMap<String, TunnelClient>>,
}

impl TunnelRegistry {
    pub fn new() -> Self {
        Self {
            clients: RwLock::new(HashMap::new()),
        }
    }
}

impl Default for TunnelRegistry {
    fn default() -> Self {
        Self::new()
    }
}
