//! In-memory implementation of DomainStore for testing.
//!
//! Uses `DashMap` for concurrent access. Suitable as a test double and as a
//! temporary stand-in when SurrealDB is unavailable.

use async_trait::async_trait;
use anyhow::Result;
use dashmap::DashMap;
use std::sync::atomic::{AtomicI64, Ordering};

use crate::store::DomainStore;
use crate::types::*;
use crate::helpers::*;
use crate::store_config::StoreSchemaConfig;

/// In-memory store backed by `DashMap`. Safe to share across tasks.
pub struct MemoryStore {
    /// proxy_name → WorkspaceProxy
    proxies: DashMap<String, WorkspaceProxy>,
    /// normalized host → ProxyDomain
    domains: DashMap<String, ProxyDomain>,
    /// Monotonic timestamp counter for tests.
    now: AtomicI64,
    /// Schema configuration for table/field names.
    schema: StoreSchemaConfig,
}

impl Default for MemoryStore {
    fn default() -> Self {
        Self::new()
    }
}

impl MemoryStore {
    /// Create a new in-memory store with studio defaults.
    pub fn new() -> Self {
        Self::new_with_config(StoreSchemaConfig::studio())
    }

    /// Create a new in-memory store with a custom schema config.
    pub fn new_with_config(schema: StoreSchemaConfig) -> Self {
        Self {
            proxies: DashMap::new(),
            domains: DashMap::new(),
            now: AtomicI64::new(1_700_000_000_000),
            schema,
        }
    }

    fn timestamp(&self) -> i64 {
        self.now.fetch_add(1, Ordering::Relaxed)
    }
}

#[async_trait]
impl DomainStore for MemoryStore {
    async fn ensure_schema(&self) -> Result<()> {
        Ok(())
    }

    async fn health(&self) -> Result<StoreHealth> {
        Ok(StoreHealth {
            ok: true,
            message: Some("memory store".into()),
        })
    }

    async fn resolve_host(&self, host: &str) -> Result<Option<DomainResolution>> {
        let normalized = normalize_host(host);
        let Some(domain) = self.domains.get(&normalized) else {
            return Ok(None);
        };
        let proxy_name = domain.proxy_id.clone();
        // Strip table prefix if present (e.g. "workspace_proxy:my-proxy" → "my-proxy")
        let proxy_key = strip_proxy_prefix(&proxy_name).to_string();
        let Some(proxy) = self.proxies.get(&proxy_key) else {
            return Ok(None);
        };
        Ok(Some(DomainResolution {
            proxy: proxy.clone(),
            domain: domain.clone(),
        }))
    }

    async fn get_domain_by_host(&self, host: &str) -> Result<Option<DomainResolution>> {
        self.resolve_host(host).await
    }

    async fn list_domains_for_studio(&self, studio_id: &str) -> Result<Vec<DomainResolution>> {
        let mut results = Vec::new();
        for entry in self.domains.iter() {
            let proxy_key = strip_proxy_prefix(&entry.value().proxy_id).to_string();
            if let Some(proxy) = self.proxies.get(&proxy_key) {
                if proxy.studio_id == studio_id {
                    results.push(DomainResolution {
                        proxy: proxy.clone(),
                        domain: entry.value().clone(),
                    });
                }
            }
        }
        Ok(results)
    }

    async fn get_proxy_by_name(&self, name: &str) -> Result<Option<WorkspaceProxy>> {
        Ok(self.proxies.get(name).map(|r| r.value().clone()))
    }

    async fn list_proxy_domains(&self, name: &str) -> Result<Vec<DomainResolution>> {
        let Some(proxy) = self.proxies.get(name) else {
            return Ok(vec![]);
        };
        let proxy_id = proxy_record_id(name);
        let proxy_clone = proxy.value().clone();
        drop(proxy);

        let mut results = Vec::new();
        for entry in self.domains.iter() {
            if entry.value().proxy_id == proxy_id {
                results.push(DomainResolution {
                    proxy: proxy_clone.clone(),
                    domain: entry.value().clone(),
                });
            }
        }
        Ok(results)
    }

    async fn upsert_proxy(&self, input: ProxyUpsertInput) -> Result<Vec<DomainResolution>> {
        let now = self.timestamp();

        let proxy = WorkspaceProxy {
            id: None,
            user_id: input.user_id,
            studio_id: input.studio_id,
            runtime_id: input.runtime_id,
            proxy_name: input.proxy_name.clone(),
            proxy_type: input.proxy_type.unwrap_or_default(),
            local_ip: input.local_ip.unwrap_or_else(|| "127.0.0.1".into()),
            local_port: input.local_port,
            remote_port: input.remote_port,
            frpc_client_id: input.frpc_client_id,
            enabled: input.enabled.unwrap_or(true),
            created_at: now,
            updated_at: now,
        };

        self.proxies.insert(input.proxy_name.clone(), proxy.clone());

        // Build domain list
        let mut all_domains = Vec::new();

        // Subdomain
        if let Some(sub) = &input.subdomain {
            let host = self.schema.subdomain_host(sub);
            let domain = ProxyDomain {
                id: None,
                host: host.clone(),
                proxy_id: proxy_record_id(&input.proxy_name),
                kind: DomainKind::Subdomain,
                status: DomainKind::Subdomain.initial_status(),
                verification_token: None,
                created_at: now,
                updated_at: now,
            };
            self.domains.insert(normalize_host(&host), domain.clone());
            all_domains.push(DomainResolution {
                proxy: proxy.clone(),
                domain,
            });
        }

        // Custom domains
        if let Some(customs) = &input.custom_domains {
            for raw_host in customs {
                let host = normalize_host(raw_host);
                let domain = ProxyDomain {
                    id: None,
                    host: host.clone(),
                    proxy_id: proxy_record_id(&input.proxy_name),
                    kind: DomainKind::Custom,
                    status: DomainKind::Custom.initial_status(),
                    verification_token: Some(format!("nova-domain={}", generate_token())),
                    created_at: now,
                    updated_at: now,
                };
                self.domains.insert(host, domain.clone());
                all_domains.push(DomainResolution {
                    proxy: proxy.clone(),
                    domain,
                });
            }
        }

        Ok(all_domains)
    }

    async fn set_domain_status(
        &self,
        host: &str,
        status: &str,
    ) -> Result<Option<DomainResolution>> {
        let normalized = normalize_host(host);
        let status: DomainStatus = status
            .parse()
            .map_err(|e: String| anyhow::anyhow!(e))?;

        let Some(mut entry) = self.domains.get_mut(&normalized) else {
            return Ok(None);
        };
        entry.value_mut().status = status;
        entry.value_mut().updated_at = self.timestamp();

        let domain = entry.value().clone();
        drop(entry);

        let proxy_key = strip_proxy_prefix(&domain.proxy_id).to_string();
        let Some(proxy) = self.proxies.get(&proxy_key) else {
            return Ok(None);
        };
        Ok(Some(DomainResolution {
            proxy: proxy.clone(),
            domain,
        }))
    }

    async fn remove_domain(&self, host: &str, _studio_id: Option<&str>) -> Result<bool> {
        let normalized = normalize_host(host);
        Ok(self.domains.remove(&normalized).is_some())
    }

    async fn disable_proxy(&self, name: &str) -> Result<()> {
        if let Some(mut proxy) = self.proxies.get_mut(name) {
            proxy.value_mut().enabled = false;
            proxy.value_mut().updated_at = self.timestamp();
        }
        Ok(())
    }
}

// ── Tests ───────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    async fn make_store_with_proxy() -> MemoryStore {
        let store = MemoryStore::new();
        store
            .upsert_proxy(ProxyUpsertInput {
                user_id: "u1".into(),
                studio_id: "s1".into(),
                runtime_id: None,
                proxy_name: "test-proxy".into(),
                proxy_type: Some(ProxyType::Http),
                local_ip: Some("10.0.0.5".into()),
                local_port: 3000,
                remote_port: None,
                frpc_client_id: None,
                enabled: Some(true),
                subdomain: Some("myapp".into()),
                custom_domains: Some(vec!["example.com".into(), "Test.ONE0.Cloud".into()]),
            })
            .await
            .unwrap();
        store
    }

    #[tokio::test]
    async fn health_check() {
        let store = MemoryStore::new();
        let h = store.health().await.unwrap();
        assert!(h.ok);
    }

    #[tokio::test]
    async fn upsert_creates_proxy_and_domains() {
        let store = make_store_with_proxy().await;

        let proxy = store.get_proxy_by_name("test-proxy").await.unwrap().unwrap();
        assert_eq!(proxy.user_id, "u1");
        assert_eq!(proxy.local_port, 3000);
        assert!(proxy.enabled);

        // Subdomain auto-activated
        let sub = store.resolve_host("myapp.dlx.studio").await.unwrap().unwrap();
        assert_eq!(sub.domain.kind, DomainKind::Subdomain);
        assert_eq!(sub.domain.status, DomainStatus::Active);

        // Custom domains pending
        let custom = store.resolve_host("example.com").await.unwrap().unwrap();
        assert_eq!(custom.domain.kind, DomainKind::Custom);
        assert_eq!(custom.domain.status, DomainStatus::Pending);
        assert!(custom.domain.verification_token.is_some());
    }

    #[tokio::test]
    async fn resolve_host_case_insensitive() {
        let store = make_store_with_proxy().await;
        // "Test.ONE0.Cloud" should normalize to "test.one0.cloud"
        let res = store.resolve_host("TEST.ONE0.CLOUD").await.unwrap();
        assert!(res.is_some(), "should resolve case-insensitively");
        assert_eq!(res.unwrap().domain.host, "test.one0.cloud");
    }

    #[tokio::test]
    async fn resolve_unknown_host_returns_none() {
        let store = MemoryStore::new();
        let res = store.resolve_host("nope.example").await.unwrap();
        assert!(res.is_none());
    }

    #[tokio::test]
    async fn set_domain_status() {
        let store = make_store_with_proxy().await;

        let updated = store
            .set_domain_status("example.com", "active")
            .await
            .unwrap()
            .unwrap();
        assert_eq!(updated.domain.status, DomainStatus::Active);

        // Verify persisted
        let res = store.resolve_host("example.com").await.unwrap().unwrap();
        assert_eq!(res.domain.status, DomainStatus::Active);
    }

    #[tokio::test]
    async fn set_domain_status_unknown_returns_none() {
        let store = MemoryStore::new();
        let res = store.set_domain_status("nope.com", "active").await.unwrap();
        assert!(res.is_none());
    }

    #[tokio::test]
    async fn remove_domain() {
        let store = make_store_with_proxy().await;
        assert!(store.remove_domain("example.com", None).await.unwrap());
        let res = store.resolve_host("example.com").await.unwrap();
        assert!(res.is_none());
    }

    #[tokio::test]
    async fn remove_unknown_domain_returns_false() {
        let store = MemoryStore::new();
        assert!(!store.remove_domain("nope.com", None).await.unwrap());
    }

    #[tokio::test]
    async fn disable_proxy() {
        let store = make_store_with_proxy().await;
        store.disable_proxy("test-proxy").await.unwrap();

        let proxy = store.get_proxy_by_name("test-proxy").await.unwrap().unwrap();
        assert!(!proxy.enabled);
    }

    #[tokio::test]
    async fn list_domains_for_studio() {
        let store = MemoryStore::new();
        // Create two proxies for same studio
        store
            .upsert_proxy(ProxyUpsertInput {
                user_id: "u1".into(),
                studio_id: "s1".into(),
                runtime_id: None,
                proxy_name: "proxy-a".into(),
                proxy_type: None,
                local_ip: None,
                local_port: 3000,
                remote_port: None,
                frpc_client_id: None,
                enabled: None,
                subdomain: None,
                custom_domains: Some(vec!["a.example".into()]),
            })
            .await
            .unwrap();
        store
            .upsert_proxy(ProxyUpsertInput {
                user_id: "u1".into(),
                studio_id: "s1".into(),
                runtime_id: None,
                proxy_name: "proxy-b".into(),
                proxy_type: None,
                local_ip: None,
                local_port: 3001,
                remote_port: None,
                frpc_client_id: None,
                enabled: None,
                subdomain: None,
                custom_domains: Some(vec!["b.example".into()]),
            })
            .await
            .unwrap();

        let domains = store.list_domains_for_studio("s1").await.unwrap();
        assert_eq!(domains.len(), 2);
    }

    #[tokio::test]
    async fn list_proxy_domains() {
        let store = make_store_with_proxy().await;
        let domains = store.list_proxy_domains("test-proxy").await.unwrap();
        // 1 subdomain + 2 custom = 3
        assert_eq!(domains.len(), 3);
    }

    #[tokio::test]
    async fn upsert_proxy_updates_existing() {
        let store = MemoryStore::new();

        store
            .upsert_proxy(ProxyUpsertInput {
                user_id: "u1".into(),
                studio_id: "s1".into(),
                runtime_id: None,
                proxy_name: "my-proxy".into(),
                proxy_type: Some(ProxyType::Http),
                local_ip: Some("10.0.0.5".into()),
                local_port: 3000,
                remote_port: None,
                frpc_client_id: None,
                enabled: Some(true),
                subdomain: None,
                custom_domains: None,
            })
            .await
            .unwrap();

        // Update with different port
        store
            .upsert_proxy(ProxyUpsertInput {
                user_id: "u1".into(),
                studio_id: "s1".into(),
                runtime_id: None,
                proxy_name: "my-proxy".into(),
                proxy_type: Some(ProxyType::Https),
                local_ip: Some("10.0.0.6".into()),
                local_port: 4000,
                remote_port: None,
                frpc_client_id: None,
                enabled: Some(true),
                subdomain: None,
                custom_domains: None,
            })
            .await
            .unwrap();

        let proxy = store.get_proxy_by_name("my-proxy").await.unwrap().unwrap();
        assert_eq!(proxy.local_port, 4000);
        assert_eq!(proxy.local_ip, "10.0.0.6");
        assert_eq!(proxy.proxy_type, ProxyType::Https);
    }
}
