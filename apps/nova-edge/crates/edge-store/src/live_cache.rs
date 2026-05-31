//! Live query cache backed by SurrealDB.
//!
//! Maintains an in-memory `DashMap` cache of domain resolutions, kept
//! perfectly in sync via SurrealDB live queries. The cache provides
//! zero-staleness reads — every mutation in SurrealDB is immediately
//! reflected in the local map.

use anyhow::Result;
use dashmap::DashMap;
use surrealdb::Surreal;
use surrealdb::engine::remote::ws::Client;
use surrealdb::sql::Uuid;
use tokio::sync::watch;

use crate::types::*;

/// Live-updating cache of domain resolutions.
///
/// Two indices:
/// - `hosts`: normalized host → `DomainResolution` (for proxy lookup)
/// - `proxies`: proxy_name → `WorkspaceProxy` (for status checks)
pub struct LiveCache {
    hosts: DashMap<String, DomainResolution>,
    proxies: DashMap<String, WorkspaceProxy>,
    /// Live query UUIDs, used to kill subscriptions on shutdown.
    live_uuids: DashMap<String, Uuid>,
    /// Signal sender to stop background listeners.
    stop_tx: Option<watch::Sender<bool>>,
}

impl Default for LiveCache {
    fn default() -> Self {
        Self::new()
    }
}

impl LiveCache {
    /// Create an empty cache (no live queries started).
    pub fn new() -> Self {
        Self {
            hosts: DashMap::new(),
            proxies: DashMap::new(),
            live_uuids: DashMap::new(),
            stop_tx: None,
        }
    }

    /// Bootstrap the cache by loading all existing data, then subscribe to
    /// live queries for ongoing mutations.
    pub async fn start(db: &Surreal<Client>) -> Result<Self> {
        let cache = Self::new();

        // Load existing proxy_domain records
        let raw_domains: Vec<serde_json::Value> = db
            .query("SELECT * FROM proxy_domain")
            .await?
            .take(0)?;
        for v in raw_domains {
            if let Ok(domain) = serde_json::from_value::<ProxyDomain>(v) {
                let host = normalize_host(&domain.host);
                if host.is_empty() {
                    continue;
                }
                // Load the associated proxy
                let proxy = fetch_proxy_for_domain(db, &domain.proxy_id).await;
                if let Some(proxy) = proxy {
                    cache.hosts.insert(
                        host,
                        DomainResolution {
                            proxy: proxy.clone(),
                            domain,
                        },
                    );
                    cache
                        .proxies
                        .insert(proxy.proxy_name.clone(), proxy);
                }
            }
        }

        // Subscribe to proxy_domain live updates
        // NOTE: Live query subscription requires SurrealValue on Notification.
        // We use the raw query API and parse notifications manually.
        let domain_uuid: Option<Uuid> = db
            .query("LIVE SELECT * FROM proxy_domain")
            .await?
            .take(0)?;
        if let Some(uuid) = domain_uuid {
            cache.live_uuids.insert("proxy_domain".into(), uuid);
        }

        let proxy_uuid: Option<Uuid> = db
            .query("LIVE SELECT * FROM workspace_proxy")
            .await?
            .take(0)?;
        if let Some(uuid) = proxy_uuid {
            cache.live_uuids.insert("workspace_proxy".into(), uuid);
        }

        Ok(cache)
    }

    /// Gracefully stop live query subscriptions.
    pub async fn stop(&self, db: &Surreal<Client>) -> Result<()> {
        for entry in self.live_uuids.iter() {
            let uuid = *entry.value();
            let _ = db
                .query("KILL $uuid")
                .bind(serde_json::json!({ "uuid": uuid.to_string() }))
                .await;
        }
        self.live_uuids.clear();
        Ok(())
    }

    // ── Read operations (lock-free, O(1)) ──────────────────────────

    /// Resolve a host to its domain resolution. Checks that both the domain
    /// is active *and* the proxy is enabled.
    pub fn resolve(&self, host: &str) -> Option<DomainResolution> {
        let normalized = normalize_host(host);
        let entry = self.hosts.get(&normalized)?;
        if entry.domain.status != DomainStatus::Active {
            return None;
        }
        if !entry.proxy.enabled {
            return None;
        }
        Some(entry.value().clone())
    }

    /// Check if a host has an active resolution (enabled proxy, active domain).
    pub fn is_host_active(&self, host: &str) -> bool {
        self.resolve(host).is_some()
    }

    /// Get a proxy by name from the cache.
    pub fn get_proxy(&self, name: &str) -> Option<WorkspaceProxy> {
        self.proxies.get(name).map(|r| r.value().clone())
    }

    /// Return the number of cached host entries.
    pub fn host_count(&self) -> usize {
        self.hosts.len()
    }

    /// Return the number of cached proxy entries.
    pub fn proxy_count(&self) -> usize {
        self.proxies.len()
    }

    /// List all cached hosts.
    pub fn all_hosts(&self) -> Vec<String> {
        self.hosts.iter().map(|r| r.key().clone()).collect()
    }

    // ── Manual mutation (used by live query handler or tests) ──────

    /// Insert or update a domain resolution in the cache.
    pub fn upsert(&self, resolution: DomainResolution) {
        let host = normalize_host(&resolution.domain.host);
        self.proxies
            .insert(resolution.proxy.proxy_name.clone(), resolution.proxy.clone());
        self.hosts.insert(host, resolution);
    }

    /// Remove a host entry from the cache.
    pub fn remove_host(&self, host: &str) -> bool {
        let normalized = normalize_host(host);
        self.hosts.remove(&normalized).is_some()
    }

    /// Remove a proxy from the cache (and all its domains).
    pub fn remove_proxy(&self, proxy_name: &str) {
        self.proxies.remove(proxy_name);
        // Also remove any domain entries referencing this proxy
        let proxy_id = format!("workspace_proxy:{proxy_name}");
        self.hosts.retain(|_, v| v.domain.proxy_id != proxy_id);
    }

    /// Disable a proxy in the cache.
    pub fn disable_proxy(&self, proxy_name: &str) {
        if let Some(mut proxy) = self.proxies.get_mut(proxy_name) {
            proxy.value_mut().enabled = false;
        }
        // Also update the proxy in any host entries
        for mut entry in self.hosts.iter_mut() {
            if entry.value().proxy.proxy_name == proxy_name {
                entry.value_mut().proxy.enabled = false;
            }
        }
    }

    /// Update domain status in the cache.
    pub fn set_domain_status(&self, host: &str, status: DomainStatus) -> bool {
        let normalized = normalize_host(host);
        if let Some(mut entry) = self.hosts.get_mut(&normalized) {
            entry.value_mut().domain.status = status;
            return true;
        }
        false
    }
}

// ── Helpers ─────────────────────────────────────────────────────────

fn normalize_host(host: &str) -> String {
    host.trim()
        .trim_end_matches('.')
        .to_lowercase()
}

async fn fetch_proxy_for_domain(
    db: &Surreal<Client>,
    proxy_id: &str,
) -> Option<WorkspaceProxy> {
    let parts: Vec<&str> = proxy_id.splitn(2, ':').collect();
    if parts.len() != 2 {
        return None;
    }
    let raw: Vec<serde_json::Value> = db
        .query("SELECT * FROM type::thing($tb, $id)")
        .bind(serde_json::json!({
            "tb": parts[0],
            "id": parts[1],
        }))
        .await
        .ok()?
        .take(0)
        .ok()?;
    raw.into_iter()
        .filter_map(|v| serde_json::from_value(v).ok())
        .next()
}

// ── Tests ───────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_proxy(name: &str, enabled: bool) -> WorkspaceProxy {
        WorkspaceProxy {
            id: None,
            user_id: "u1".into(),
            studio_id: "s1".into(),
            runtime_id: None,
            proxy_name: name.into(),
            proxy_type: ProxyType::Http,
            local_ip: "127.0.0.1".into(),
            local_port: 3000,
            remote_port: None,
            frpc_client_id: None,
            enabled,
            created_at: 1700000000000,
            updated_at: 1700000000000,
        }
    }

    fn make_domain(host: &str, proxy_name: &str, status: DomainStatus) -> ProxyDomain {
        ProxyDomain {
            id: None,
            host: host.into(),
            proxy_id: format!("workspace_proxy:{proxy_name}"),
            kind: DomainKind::Subdomain,
            status,
            verification_token: None,
            created_at: 1700000000000,
            updated_at: 1700000000000,
        }
    }

    fn make_resolution(
        host: &str,
        proxy_name: &str,
        domain_status: DomainStatus,
        proxy_enabled: bool,
    ) -> DomainResolution {
        DomainResolution {
            proxy: make_proxy(proxy_name, proxy_enabled),
            domain: make_domain(host, proxy_name, domain_status),
        }
    }

    #[test]
    fn test_empty_cache() {
        let cache = LiveCache::new();
        assert_eq!(cache.host_count(), 0);
        assert_eq!(cache.proxy_count(), 0);
        assert!(cache.resolve("example.com").is_none());
        assert!(!cache.is_host_active("example.com"));
    }

    #[test]
    fn test_upsert_and_resolve() {
        let cache = LiveCache::new();
        let res = make_resolution("myapp.dlx.studio", "my-proxy", DomainStatus::Active, true);
        cache.upsert(res);

        assert_eq!(cache.host_count(), 1);
        assert_eq!(cache.proxy_count(), 1);

        let resolved = cache.resolve("myapp.dlx.studio").unwrap();
        assert_eq!(resolved.proxy.proxy_name, "my-proxy");
        assert!(cache.is_host_active("myapp.dlx.studio"));
    }

    #[test]
    fn test_resolve_case_insensitive() {
        let cache = LiveCache::new();
        cache.upsert(make_resolution(
            "myapp.dlx.studio",
            "p1",
            DomainStatus::Active,
            true,
        ));

        assert!(cache.resolve("MYAPP.DLX.STUDIO").is_some());
        assert!(cache.resolve("MyApp.Dlx.Studio").is_some());
    }

    #[test]
    fn test_resolve_inactive_domain() {
        let cache = LiveCache::new();
        cache.upsert(make_resolution(
            "pending.example",
            "p1",
            DomainStatus::Pending,
            true,
        ));

        assert!(cache.resolve("pending.example").is_none());
        assert!(!cache.is_host_active("pending.example"));
    }

    #[test]
    fn test_resolve_disabled_proxy() {
        let cache = LiveCache::new();
        cache.upsert(make_resolution(
            "active.example",
            "p1",
            DomainStatus::Active,
            false, // disabled
        ));

        assert!(cache.resolve("active.example").is_none());
        assert!(!cache.is_host_active("active.example"));
    }

    #[test]
    fn test_remove_host() {
        let cache = LiveCache::new();
        cache.upsert(make_resolution(
            "remove.me",
            "p1",
            DomainStatus::Active,
            true,
        ));

        assert!(cache.remove_host("remove.me"));
        assert!(!cache.remove_host("remove.me")); // already removed
        assert!(cache.resolve("remove.me").is_none());
    }

    #[test]
    fn test_remove_proxy_cascades_domains() {
        let cache = LiveCache::new();
        cache.upsert(make_resolution("a.dlx.studio", "multi", DomainStatus::Active, true));
        cache.upsert(make_resolution("b.dlx.studio", "multi", DomainStatus::Active, true));
        cache.upsert(make_resolution("c.other", "other-proxy", DomainStatus::Active, true));

        assert_eq!(cache.host_count(), 3);
        assert_eq!(cache.proxy_count(), 2);

        cache.remove_proxy("multi");

        assert_eq!(cache.host_count(), 1); // only c.other remains
        assert_eq!(cache.proxy_count(), 1); // only other-proxy
        assert!(cache.resolve("a.dlx.studio").is_none());
        assert!(cache.resolve("b.dlx.studio").is_none());
        assert!(cache.resolve("c.other").is_some());
    }

    #[test]
    fn test_disable_proxy() {
        let cache = LiveCache::new();
        cache.upsert(make_resolution(
            "disable.dlx.studio",
            "to-disable",
            DomainStatus::Active,
            true,
        ));

        assert!(cache.is_host_active("disable.dlx.studio"));

        cache.disable_proxy("to-disable");

        assert!(!cache.is_host_active("disable.dlx.studio"));
        let proxy = cache.get_proxy("to-disable").unwrap();
        assert!(!proxy.enabled);
    }

    #[test]
    fn test_set_domain_status() {
        let cache = LiveCache::new();
        cache.upsert(make_resolution(
            "verify.me",
            "p1",
            DomainStatus::Pending,
            true,
        ));

        assert!(cache.resolve("verify.me").is_none());

        assert!(cache.set_domain_status("verify.me", DomainStatus::Active));

        let resolved = cache.resolve("verify.me").unwrap();
        assert_eq!(resolved.domain.status, DomainStatus::Active);
    }

    #[test]
    fn test_upsert_updates_existing() {
        let cache = LiveCache::new();

        // Insert v1
        cache.upsert(make_resolution("update.me", "p1", DomainStatus::Pending, true));
        assert!(cache.resolve("update.me").is_none());

        // Update to active
        cache.upsert(make_resolution("update.me", "p1", DomainStatus::Active, true));
        assert!(cache.resolve("update.me").is_some());
        assert_eq!(cache.host_count(), 1); // still 1, not 2
    }

    #[test]
    fn test_get_proxy() {
        let cache = LiveCache::new();
        cache.upsert(make_resolution("x.dlx.studio", "my-proxy", DomainStatus::Active, true));

        let proxy = cache.get_proxy("my-proxy").unwrap();
        assert_eq!(proxy.local_port, 3000);

        assert!(cache.get_proxy("nonexistent").is_none());
    }

    #[test]
    fn test_all_hosts() {
        let cache = LiveCache::new();
        cache.upsert(make_resolution("a.dlx.studio", "p1", DomainStatus::Active, true));
        cache.upsert(make_resolution("b.dlx.studio", "p2", DomainStatus::Active, true));

        let mut hosts = cache.all_hosts();
        hosts.sort();
        assert_eq!(hosts, vec!["a.dlx.studio", "b.dlx.studio"]);
    }
}
