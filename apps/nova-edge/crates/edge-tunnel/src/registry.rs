//! Active tunnel registry — multi-connection load balancing.
//!
//! Tracks connected tunnel clients and the proxy names they serve.
//! Multiple clients can serve the same proxy; selection is round-robin.

use dashmap::DashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tracing::{debug, info, warn};

/// Represents a connected tunnel client.
#[derive(Debug, Clone)]
pub struct TunnelClient {
    pub run_id: String,
    pub proxy_names: Vec<String>,
    /// When this client was registered.
    pub registered_at: Instant,
    /// Last heartbeat or activity timestamp.
    pub last_seen: Instant,
}

/// Per-proxy round-robin cursor.
struct ProxySlot {
    /// Client run_ids serving this proxy.
    client_ids: Vec<String>,
    /// Current cursor for round-robin.
    cursor: AtomicUsize,
}

/// Concurrent-safe registry of active tunnel clients.
pub struct TunnelRegistry {
    /// run_id → TunnelClient
    clients: DashMap<String, TunnelClient>,
    /// proxy_name → ProxySlot (list of client run_ids + cursor)
    proxy_slots: DashMap<String, ProxySlot>,
}

impl Default for TunnelRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl TunnelRegistry {
    pub fn new() -> Self {
        Self {
            clients: DashMap::new(),
            proxy_slots: DashMap::new(),
        }
    }

    /// Register a client and the proxy names it serves.
    /// Returns true if the client was newly inserted (false if replaced).
    pub fn register(&self, client: TunnelClient) -> bool {
        let run_id = client.run_id.clone();
        let proxy_names = client.proxy_names.clone();
        let is_new = !self.clients.contains_key(&run_id);

        // If replacing, clean up old proxy slots first
        if !is_new {
            if let Some(old_client) = self.clients.get(&run_id) {
                let old_proxies = old_client.proxy_names.clone();
                drop(old_client);
                for old_proxy in &old_proxies {
                    if !proxy_names.contains(old_proxy) {
                        // Remove run_id from old proxy slot using entry API
                        match self.proxy_slots.entry(old_proxy.clone()) {
                            dashmap::mapref::entry::Entry::Occupied(mut entry) => {
                                entry.get_mut().client_ids.retain(|id| id != &run_id);
                                if entry.get().client_ids.is_empty() {
                                    entry.remove();
                                }
                            }
                            dashmap::mapref::entry::Entry::Vacant(_) => {}
                        }
                    }
                }
            }
        }

        // Upsert the client
        self.clients.insert(run_id.clone(), client);

        // Update proxy slots
        for proxy_name in &proxy_names {
            self.proxy_slots
                .entry(proxy_name.clone())
                .and_modify(|slot| {
                    if !slot.client_ids.contains(&run_id) {
                        slot.client_ids.push(run_id.clone());
                    }
                })
                .or_insert_with(|| ProxySlot {
                    client_ids: vec![run_id.clone()],
                    cursor: AtomicUsize::new(0),
                });
        }

        info!(
            run_id = %run_id,
            proxies = ?proxy_names,
            new = is_new,
            "Registered tunnel client"
        );
        is_new
    }

    /// Unregister a client by run_id. Removes it from all proxy slots.
    /// Returns the removed client, if any.
    pub fn unregister(&self, run_id: &str) -> Option<TunnelClient> {
        let removed = self.clients.remove(run_id);
        if let Some((_, client)) = &removed {
            for proxy_name in &client.proxy_names {
                self.proxy_slots.entry(proxy_name.clone()).and_modify(|slot| {
                    slot.client_ids.retain(|id| id != run_id);
                });
                // Clean up empty slots
                if let Some(slot) = self.proxy_slots.get(proxy_name) {
                    if slot.client_ids.is_empty() {
                        drop(slot);
                        self.proxy_slots.remove(proxy_name);
                    }
                }
            }
            info!(run_id = %run_id, "Unregistered tunnel client");
        }
        removed.map(|(_, v)| v)
    }

    /// Get a connection for the given proxy name using round-robin selection.
    /// Returns `None` if no clients serve this proxy.
    pub fn get_connection(&self, proxy_name: &str) -> Option<TunnelClient> {
        let slot = self.proxy_slots.get(proxy_name)?;
        if slot.client_ids.is_empty() {
            return None;
        }
        let idx = slot.cursor.fetch_add(1, Ordering::Relaxed) % slot.client_ids.len();
        let run_id = &slot.client_ids[idx];
        self.clients.get(run_id).map(|r| r.value().clone())
    }

    /// Update the last_seen timestamp for a client (e.g. on heartbeat).
    pub fn touch(&self, run_id: &str) -> bool {
        if let Some(mut client) = self.clients.get_mut(run_id) {
            client.value_mut().last_seen = Instant::now();
            true
        } else {
            false
        }
    }

    /// List all registered run_ids.
    pub fn client_ids(&self) -> Vec<String> {
        self.clients.iter().map(|r| r.key().clone()).collect()
    }

    /// Number of registered clients.
    pub fn client_count(&self) -> usize {
        self.clients.len()
    }

    /// Number of proxy names with at least one client.
    pub fn proxy_count(&self) -> usize {
        self.proxy_slots.len()
    }

    /// Get a specific client by run_id.
    pub fn get_client(&self, run_id: &str) -> Option<TunnelClient> {
        self.clients.get(run_id).map(|r| r.value().clone())
    }

    /// List all proxy names that have at least one client registered.
    pub fn active_proxy_names(&self) -> Vec<String> {
        self.proxy_slots.iter().map(|r| r.key().clone()).collect()
    }

    /// Number of clients serving a specific proxy.
    pub fn client_count_for_proxy(&self, proxy_name: &str) -> usize {
        self.proxy_slots
            .get(proxy_name)
            .map(|s| s.client_ids.len())
            .unwrap_or(0)
    }
}

// ── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    use std::time::Duration;

    fn make_client(run_id: &str, proxy_names: &[&str]) -> TunnelClient {
        TunnelClient {
            run_id: run_id.to_string(),
            proxy_names: proxy_names.iter().map(|s| s.to_string()).collect(),
            registered_at: Instant::now(),
            last_seen: Instant::now(),
        }
    }

    #[test]
    fn register_single_client() {
        let registry = TunnelRegistry::new();
        let client = make_client("run-1", &["proxy-a"]);
        let is_new = registry.register(client);

        assert!(is_new);
        assert_eq!(registry.client_count(), 1);
        assert_eq!(registry.proxy_count(), 1);

        let conn = registry.get_connection("proxy-a").unwrap();
        assert_eq!(conn.run_id, "run-1");
    }

    #[test]
    fn register_replaces_existing() {
        let registry = TunnelRegistry::new();

        let client1 = make_client("run-1", &["proxy-a"]);
        registry.register(client1);

        let client2 = make_client("run-1", &["proxy-b"]);
        let is_new = registry.register(client2);

        assert!(!is_new); // replaced, not new
        assert_eq!(registry.client_count(), 1);
        assert!(registry.get_connection("proxy-a").is_none());
        assert!(registry.get_connection("proxy-b").is_some());
    }

    #[test]
    fn unregister_client() {
        let registry = TunnelRegistry::new();
        registry.register(make_client("run-1", &["proxy-a"]));

        let removed = registry.unregister("run-1");
        assert!(removed.is_some());
        assert_eq!(registry.client_count(), 0);
        assert_eq!(registry.proxy_count(), 0);
        assert!(registry.get_connection("proxy-a").is_none());
    }

    #[test]
    fn unregister_nonexistent() {
        let registry = TunnelRegistry::new();
        assert!(registry.unregister("ghost").is_none());
    }

    #[test]
    fn round_robin_two_clients_same_proxy() {
        let registry = TunnelRegistry::new();
        registry.register(make_client("run-1", &["proxy-a"]));
        registry.register(make_client("run-2", &["proxy-a"]));

        assert_eq!(registry.client_count(), 2);
        assert_eq!(registry.client_count_for_proxy("proxy-a"), 2);

        // Round-robin should alternate
        let first = registry.get_connection("proxy-a").unwrap();
        let second = registry.get_connection("proxy-a").unwrap();
        let third = registry.get_connection("proxy-a").unwrap();

        // First and third should be the same (round back)
        assert_eq!(first.run_id, third.run_id);
        // First and second should be different
        assert_ne!(first.run_id, second.run_id);
    }

    #[test]
    fn round_robin_unregister_one() {
        let registry = TunnelRegistry::new();
        registry.register(make_client("run-1", &["proxy-a"]));
        registry.register(make_client("run-2", &["proxy-a"]));

        registry.unregister("run-1");

        assert_eq!(registry.client_count(), 1);
        assert_eq!(registry.client_count_for_proxy("proxy-a"), 1);

        // Only run-2 remains
        let conn = registry.get_connection("proxy-a").unwrap();
        assert_eq!(conn.run_id, "run-2");
    }

    #[test]
    fn multiple_proxies_per_client() {
        let registry = TunnelRegistry::new();
        registry.register(make_client("run-1", &["proxy-a", "proxy-b", "proxy-c"]));

        assert_eq!(registry.proxy_count(), 3);
        assert!(registry.get_connection("proxy-a").is_some());
        assert!(registry.get_connection("proxy-b").is_some());
        assert!(registry.get_connection("proxy-c").is_some());
    }

    #[test]
    fn get_connection_unknown_proxy() {
        let registry = TunnelRegistry::new();
        assert!(registry.get_connection("nonexistent").is_none());
    }

    #[test]
    fn touch_updates_last_seen() {
        let registry = TunnelRegistry::new();
        registry.register(make_client("run-1", &["proxy-a"]));

        let original = registry.get_client("run-1").unwrap();
        // Small sleep to ensure time difference
        thread::sleep(Duration::from_millis(10));

        assert!(registry.touch("run-1"));
        let updated = registry.get_client("run-1").unwrap();
        assert!(updated.last_seen > original.last_seen);
    }

    #[test]
    fn touch_unknown_client() {
        let registry = TunnelRegistry::new();
        assert!(!registry.touch("ghost"));
    }

    #[test]
    fn active_proxy_names() {
        let registry = TunnelRegistry::new();
        registry.register(make_client("run-1", &["proxy-a", "proxy-b"]));
        registry.register(make_client("run-2", &["proxy-c"]));

        let mut names = registry.active_proxy_names();
        names.sort();
        assert_eq!(names, vec!["proxy-a", "proxy-b", "proxy-c"]);
    }

    #[test]
    fn client_ids_listing() {
        let registry = TunnelRegistry::new();
        registry.register(make_client("run-1", &["proxy-a"]));
        registry.register(make_client("run-2", &["proxy-b"]));

        let mut ids = registry.client_ids();
        ids.sort();
        assert_eq!(ids, vec!["run-1", "run-2"]);
    }
}
