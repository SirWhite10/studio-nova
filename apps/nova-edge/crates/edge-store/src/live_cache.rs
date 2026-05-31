//! Live query cache backed by SurrealDB
//! TODO: implement DashMap-based cache populated by live queries

use dashmap::DashMap;
use crate::types::DomainResolution;

pub struct LiveCache {
    pub hosts: DashMap<String, DomainResolution>,
}

impl LiveCache {
    pub fn new() -> Self {
        Self {
            hosts: DashMap::new(),
        }
    }

    pub fn get(&self, host: &str) -> Option<DomainResolution> {
        self.hosts.get(host).map(|r| r.value().clone())
    }
}

impl Default for LiveCache {
    fn default() -> Self {
        Self::new()
    }
}
