//! Tunnel metrics logging.
//!
//! Tracks bytes_sent, bytes_received, active_connections per tunnel client
//! and provides aggregation capabilities.

use chrono::{DateTime, Utc};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{debug, info};

/// Metrics for a single tunnel client.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TunnelMetrics {
    pub client_id: String,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub connections: u64,
    pub last_updated: DateTime<Utc>,
}

impl TunnelMetrics {
    /// Create a new metrics entry for a client.
    pub fn new(client_id: String) -> Self {
        Self {
            client_id,
            bytes_sent: 0,
            bytes_received: 0,
            connections: 0,
            last_updated: Utc::now(),
        }
    }

    /// Record bytes sent to this client.
    pub fn record_sent(&mut self, bytes: u64) {
        self.bytes_sent += bytes;
        self.last_updated = Utc::now();
    }

    /// Record bytes received from this client.
    pub fn record_received(&mut self, bytes: u64) {
        self.bytes_received += bytes;
        self.last_updated = Utc::now();
    }

    /// Increment the connection count.
    pub fn increment_connections(&mut self) {
        self.connections += 1;
        self.last_updated = Utc::now();
    }

    /// Decrement the connection count (minimum 0).
    pub fn decrement_connections(&mut self) {
        self.connections = self.connections.saturating_sub(1);
        self.last_updated = Utc::now();
    }
}

/// A store for tunnel metrics across all clients.
pub struct TunnelMetricsStore {
    metrics: DashMap<String, TunnelMetrics>,
}

impl Default for TunnelMetricsStore {
    fn default() -> Self {
        Self::new()
    }
}

impl TunnelMetricsStore {
    pub fn new() -> Self {
        Self {
            metrics: DashMap::new(),
        }
    }

    /// Create a shared (Arc-wrapped) store.
    pub fn shared() -> Arc<Self> {
        Arc::new(Self::new())
    }

    /// Get or create metrics for a client.
    pub fn get_or_create(&self, client_id: &str) -> TunnelMetrics {
        self.metrics
            .entry(client_id.to_string())
            .or_insert_with(|| TunnelMetrics::new(client_id.to_string()))
            .value()
            .clone()
    }

    /// Record bytes sent for a client.
    pub fn record_sent(&self, client_id: &str, bytes: u64) {
        let mut entry = self.metrics
            .entry(client_id.to_string())
            .or_insert_with(|| TunnelMetrics::new(client_id.to_string()));
        entry.value_mut().record_sent(bytes);
        debug!(client_id = %client_id, bytes = bytes, "Recorded bytes sent");
    }

    /// Record bytes received for a client.
    pub fn record_received(&self, client_id: &str, bytes: u64) {
        let mut entry = self.metrics
            .entry(client_id.to_string())
            .or_insert_with(|| TunnelMetrics::new(client_id.to_string()));
        entry.value_mut().record_received(bytes);
        debug!(client_id = %client_id, bytes = bytes, "Recorded bytes received");
    }

    /// Increment connections for a client.
    pub fn increment_connections(&self, client_id: &str) {
        let mut entry = self.metrics
            .entry(client_id.to_string())
            .or_insert_with(|| TunnelMetrics::new(client_id.to_string()));
        entry.value_mut().increment_connections();
    }

    /// Decrement connections for a client.
    pub fn decrement_connections(&self, client_id: &str) {
        if let Some(mut entry) = self.metrics.get_mut(client_id) {
            entry.value_mut().decrement_connections();
        }
    }

    /// Remove metrics for a client.
    pub fn remove(&self, client_id: &str) -> Option<TunnelMetrics> {
        self.metrics.remove(client_id).map(|(_, v)| v)
    }

    /// Get metrics for a specific client.
    pub fn get(&self, client_id: &str) -> Option<TunnelMetrics> {
        self.metrics.get(client_id).map(|r| r.value().clone())
    }

    /// Aggregate metrics across all clients.
    pub fn aggregate(&self) -> TunnelMetricsAggregate {
        let mut total_sent = 0u64;
        let mut total_received = 0u64;
        let mut total_connections = 0u64;
        let mut client_count = 0u64;

        for entry in self.metrics.iter() {
            total_sent += entry.value().bytes_sent;
            total_received += entry.value().bytes_received;
            total_connections += entry.value().connections;
            client_count += 1;
        }

        TunnelMetricsAggregate {
            total_bytes_sent: total_sent,
            total_bytes_received: total_received,
            total_connections,
            client_count,
        }
    }

    /// List all client IDs with metrics.
    pub fn client_ids(&self) -> Vec<String> {
        self.metrics.iter().map(|r| r.key().clone()).collect()
    }

    /// Number of tracked clients.
    pub fn len(&self) -> usize {
        self.metrics.len()
    }

    /// Check if the store is empty.
    pub fn is_empty(&self) -> bool {
        self.metrics.is_empty()
    }
}

/// Aggregated metrics across all tunnel clients.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TunnelMetricsAggregate {
    pub total_bytes_sent: u64,
    pub total_bytes_received: u64,
    pub total_connections: u64,
    pub client_count: u64,
}

// ── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_metrics_starts_at_zero() {
        let m = TunnelMetrics::new("client-1".into());
        assert_eq!(m.client_id, "client-1");
        assert_eq!(m.bytes_sent, 0);
        assert_eq!(m.bytes_received, 0);
        assert_eq!(m.connections, 0);
    }

    #[test]
    fn record_sent_accumulates() {
        let mut m = TunnelMetrics::new("c1".into());
        m.record_sent(100);
        assert_eq!(m.bytes_sent, 100);
        m.record_sent(50);
        assert_eq!(m.bytes_sent, 150);
    }

    #[test]
    fn record_received_accumulates() {
        let mut m = TunnelMetrics::new("c1".into());
        m.record_received(200);
        assert_eq!(m.bytes_received, 200);
        m.record_received(300);
        assert_eq!(m.bytes_received, 500);
    }

    #[test]
    fn increment_decrement_connections() {
        let mut m = TunnelMetrics::new("c1".into());
        m.increment_connections();
        m.increment_connections();
        assert_eq!(m.connections, 2);
        m.decrement_connections();
        assert_eq!(m.connections, 1);
    }

    #[test]
    fn decrement_connections_saturating() {
        let mut m = TunnelMetrics::new("c1".into());
        m.decrement_connections();
        assert_eq!(m.connections, 0);
    }

    #[test]
    fn last_updated_changes() {
        let mut m = TunnelMetrics::new("c1".into());
        let t1 = m.last_updated;
        std::thread::sleep(std::time::Duration::from_millis(10));
        m.record_sent(1);
        assert!(m.last_updated > t1);
    }

    #[test]
    fn metrics_serde_roundtrip() {
        let m = TunnelMetrics::new("client-1".into());
        let json = serde_json::to_string(&m).unwrap();
        let back: TunnelMetrics = serde_json::from_str(&json).unwrap();
        assert_eq!(m, back);
    }

    #[test]
    fn store_record_and_get() {
        let store = TunnelMetricsStore::new();
        store.record_sent("c1", 100);
        store.record_received("c1", 200);
        store.increment_connections("c1");

        let m = store.get("c1").unwrap();
        assert_eq!(m.bytes_sent, 100);
        assert_eq!(m.bytes_received, 200);
        assert_eq!(m.connections, 1);
    }

    #[test]
    fn store_multiple_clients() {
        let store = TunnelMetricsStore::new();
        store.record_sent("c1", 100);
        store.record_sent("c2", 200);
        store.record_received("c1", 50);

        assert_eq!(store.len(), 2);

        let m1 = store.get("c1").unwrap();
        assert_eq!(m1.bytes_sent, 100);
        assert_eq!(m1.bytes_received, 50);

        let m2 = store.get("c2").unwrap();
        assert_eq!(m2.bytes_sent, 200);
        assert_eq!(m2.bytes_received, 0);
    }

    #[test]
    fn store_aggregate() {
        let store = TunnelMetricsStore::new();
        store.record_sent("c1", 100);
        store.record_received("c1", 50);
        store.increment_connections("c1");

        store.record_sent("c2", 200);
        store.record_received("c2", 150);
        store.increment_connections("c2");
        store.increment_connections("c2");

        let agg = store.aggregate();
        assert_eq!(agg.total_bytes_sent, 300);
        assert_eq!(agg.total_bytes_received, 200);
        assert_eq!(agg.total_connections, 3);
        assert_eq!(agg.client_count, 2);
    }

    #[test]
    fn store_remove() {
        let store = TunnelMetricsStore::new();
        store.record_sent("c1", 100);
        assert_eq!(store.len(), 1);

        let removed = store.remove("c1");
        assert!(removed.is_some());
        assert_eq!(removed.unwrap().bytes_sent, 100);
        assert_eq!(store.len(), 0);
    }

    #[test]
    fn store_remove_nonexistent() {
        let store = TunnelMetricsStore::new();
        assert!(store.remove("ghost").is_none());
    }

    #[test]
    fn store_get_nonexistent() {
        let store = TunnelMetricsStore::new();
        assert!(store.get("ghost").is_none());
    }

    #[test]
    fn store_get_or_create() {
        let store = TunnelMetricsStore::new();
        let m = store.get_or_create("c1");
        assert_eq!(m.client_id, "c1");
        assert_eq!(m.bytes_sent, 0);

        store.record_sent("c1", 100);
        let m2 = store.get_or_create("c1");
        assert_eq!(m2.bytes_sent, 100);
    }

    #[test]
    fn store_client_ids() {
        let store = TunnelMetricsStore::new();
        store.record_sent("c1", 1);
        store.record_sent("c2", 1);

        let mut ids = store.client_ids();
        ids.sort();
        assert_eq!(ids, vec!["c1", "c2"]);
    }

    #[test]
    fn store_decrement_unknown_client() {
        let store = TunnelMetricsStore::new();
        // Should not panic
        store.decrement_connections("ghost");
    }

    #[test]
    fn aggregate_empty_store() {
        let store = TunnelMetricsStore::new();
        let agg = store.aggregate();
        assert_eq!(agg.total_bytes_sent, 0);
        assert_eq!(agg.total_bytes_received, 0);
        assert_eq!(agg.total_connections, 0);
        assert_eq!(agg.client_count, 0);
    }

    #[test]
    fn aggregate_serde_roundtrip() {
        let agg = TunnelMetricsAggregate {
            total_bytes_sent: 1000,
            total_bytes_received: 500,
            total_connections: 5,
            client_count: 3,
        };
        let json = serde_json::to_string(&agg).unwrap();
        let back: TunnelMetricsAggregate = serde_json::from_str(&json).unwrap();
        assert_eq!(agg, back);
    }
}
