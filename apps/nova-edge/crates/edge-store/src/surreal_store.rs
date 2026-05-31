//! SurrealStore — SurrealDB-backed DomainStore implementation.
//!
//! Query patterns mirror the TypeScript `nova-domain-control` store exactly,
//! using the same SurrealQL and camelCase field names.

use async_trait::async_trait;
use anyhow::Result;
use surrealdb::Surreal;
use surrealdb::engine::remote::ws::Client;

use crate::store::DomainStore;
use crate::types::*;

pub struct SurrealStore {
    db: Surreal<Client>,
}

impl SurrealStore {
    pub fn new(db: Surreal<Client>) -> Self {
        Self { db }
    }

    /// Helper: run a query that returns the first result set as Vec<T>.
    async fn query_rows<T: serde::de::DeserializeOwned>(
        &self,
        sql: &str,
        vars: serde_json::Value,
    ) -> Result<Vec<T>> {
        let mut response = self.db.query(sql).bind(vars).await?;
        let rows: Vec<T> = response.take(0)?;
        Ok(rows)
    }
}

// ── Schema ──────────────────────────────────────────────────────────

const SCHEMA_DDL: &[&str] = &[
    "DEFINE TABLE IF NOT EXISTS workspace_proxy SCHEMALESS",
    "DEFINE FIELD IF NOT EXISTS userId ON workspace_proxy TYPE string",
    "DEFINE FIELD IF NOT EXISTS studioId ON workspace_proxy TYPE string",
    "DEFINE FIELD IF NOT EXISTS runtimeId ON workspace_proxy TYPE option<string>",
    "DEFINE FIELD IF NOT EXISTS proxyName ON workspace_proxy TYPE string",
    "DEFINE FIELD IF NOT EXISTS proxyType ON workspace_proxy TYPE string",
    "DEFINE FIELD IF NOT EXISTS localIP ON workspace_proxy TYPE string DEFAULT '127.0.0.1'",
    "DEFINE FIELD IF NOT EXISTS localPort ON workspace_proxy TYPE number",
    "DEFINE FIELD IF NOT EXISTS remotePort ON workspace_proxy TYPE option<number>",
    "DEFINE FIELD IF NOT EXISTS frpcClientId ON workspace_proxy TYPE option<string>",
    "DEFINE FIELD IF NOT EXISTS enabled ON workspace_proxy TYPE bool DEFAULT true",
    "DEFINE FIELD IF NOT EXISTS createdAt ON workspace_proxy TYPE number",
    "DEFINE FIELD IF NOT EXISTS updatedAt ON workspace_proxy TYPE number",
    "DEFINE INDEX IF NOT EXISTS idx_workspace_proxy_studio ON workspace_proxy FIELDS studioId",
    "DEFINE INDEX IF NOT EXISTS idx_workspace_proxy_name ON workspace_proxy FIELDS proxyName UNIQUE",
    "DEFINE TABLE IF NOT EXISTS proxy_domain SCHEMALESS",
    "DEFINE FIELD IF NOT EXISTS host ON proxy_domain TYPE string",
    "DEFINE FIELD IF NOT EXISTS proxyId ON proxy_domain TYPE string",
    "DEFINE FIELD IF NOT EXISTS kind ON proxy_domain TYPE string",
    "DEFINE FIELD IF NOT EXISTS status ON proxy_domain TYPE string",
    "DEFINE FIELD IF NOT EXISTS verificationToken ON proxy_domain TYPE option<string>",
    "DEFINE FIELD IF NOT EXISTS createdAt ON proxy_domain TYPE number",
    "DEFINE FIELD IF NOT EXISTS updatedAt ON proxy_domain TYPE number",
    "DEFINE INDEX IF NOT EXISTS idx_proxy_domain_host ON proxy_domain FIELDS host UNIQUE",
    "DEFINE INDEX IF NOT EXISTS idx_proxy_domain_proxy ON proxy_domain FIELDS proxyId",
];

#[async_trait]
impl DomainStore for SurrealStore {
    async fn ensure_schema(&self) -> Result<()> {
        for ddl in SCHEMA_DDL {
            self.db.query(*ddl).await?;
        }
        Ok(())
    }

    async fn health(&self) -> Result<StoreHealth> {
        // Ping by running a trivial query
        let result: Option<serde_json::Value> = self.db.query("RETURN true").await?.take(0)?;
        Ok(StoreHealth {
            ok: result == Some(serde_json::Value::Bool(true)),
            message: Some("surrealdb connected".into()),
        })
    }

    async fn resolve_host(&self, host: &str) -> Result<Option<DomainResolution>> {
        let normalized = normalize_host(host);

        // Find active domain by host
        let domains: Vec<ProxyDomain> = self
            .query_rows(
                "SELECT * FROM proxy_domain WHERE host = $host AND status = 'active' LIMIT 1",
                serde_json::json!({ "host": normalized }),
            )
            .await?;

        let domain = match domains.into_iter().next() {
            Some(d) => d,
            None => return Ok(None),
        };

        // Load the proxy by proxyId
        let proxy = self.fetch_proxy_by_record_id(&domain.proxy_id).await?;
        let Some(proxy) = proxy else {
            return Ok(None);
        };
        if !proxy.enabled {
            return Ok(None);
        }

        Ok(Some(DomainResolution { proxy, domain }))
    }

    async fn get_domain_by_host(&self, host: &str) -> Result<Option<DomainResolution>> {
        let normalized = normalize_host(host);

        let domains: Vec<ProxyDomain> = self
            .query_rows(
                "SELECT * FROM proxy_domain WHERE host = $host LIMIT 1",
                serde_json::json!({ "host": normalized }),
            )
            .await?;

        let domain = match domains.into_iter().next() {
            Some(d) => d,
            None => return Ok(None),
        };

        let proxy = self.fetch_proxy_by_record_id(&domain.proxy_id).await?;
        let Some(proxy) = proxy else {
            return Ok(None);
        };

        Ok(Some(DomainResolution { proxy, domain }))
    }

    async fn list_domains_for_studio(&self, studio_id: &str) -> Result<Vec<DomainResolution>> {
        let proxies: Vec<WorkspaceProxy> = self
            .query_rows(
                "SELECT * FROM workspace_proxy WHERE studioId = $studioId ORDER BY updatedAt DESC",
                serde_json::json!({ "studioId": studio_id }),
            )
            .await?;

        let mut results = Vec::new();
        for proxy in proxies {
            let proxy_id = proxy
                .id
                .as_ref()
                .and_then(|v| v.get("tb").and_then(|t| t.as_str()).and_then(|tb| {
                    v.get("id")
                        .and_then(|i| i.get("String").and_then(|s| s.as_str()))
                        .map(|s| format!("{tb}:{s}"))
                }))
                .unwrap_or_default();

            let domains: Vec<ProxyDomain> = self
                .query_rows(
                    "SELECT * FROM proxy_domain WHERE proxyId = $proxyId ORDER BY updatedAt DESC",
                    serde_json::json!({ "proxyId": proxy_id }),
                )
                .await?;

            for domain in domains {
                results.push(DomainResolution {
                    proxy: proxy.clone(),
                    domain,
                });
            }
        }
        Ok(results)
    }

    async fn get_proxy_by_name(&self, name: &str) -> Result<Option<WorkspaceProxy>> {
        let proxies: Vec<WorkspaceProxy> = self
            .query_rows(
                "SELECT * FROM workspace_proxy WHERE proxyName = $proxyName AND enabled = true LIMIT 1",
                serde_json::json!({ "proxyName": name }),
            )
            .await?;
        Ok(proxies.into_iter().next())
    }

    async fn list_proxy_domains(&self, name: &str) -> Result<Vec<DomainResolution>> {
        let proxies: Vec<WorkspaceProxy> = self
            .query_rows(
                "SELECT * FROM workspace_proxy WHERE proxyName = $proxyName LIMIT 1",
                serde_json::json!({ "proxyName": name }),
            )
            .await?;

        let proxy = match proxies.into_iter().next() {
            Some(p) => p,
            None => return Ok(vec![]),
        };

        let proxy_id = record_id_string(&proxy.id);
        let domains: Vec<ProxyDomain> = self
            .query_rows(
                "SELECT * FROM proxy_domain WHERE proxyId = $proxyId",
                serde_json::json!({ "proxyId": proxy_id }),
            )
            .await?;

        Ok(domains
            .into_iter()
            .map(|domain| DomainResolution {
                proxy: proxy.clone(),
                domain,
            })
            .collect())
    }

    async fn upsert_proxy(&self, input: ProxyUpsertInput) -> Result<Vec<DomainResolution>> {
        let now = chrono::Utc::now().timestamp_millis();

        // Check for existing proxy
        let existing: Vec<WorkspaceProxy> = self
            .query_rows(
                "SELECT * FROM workspace_proxy WHERE proxyName = $proxyName LIMIT 1",
                serde_json::json!({ "proxyName": &input.proxy_name }),
            )
            .await?;

        let proxy_content = serde_json::json!({
            "userId": input.user_id,
            "studioId": input.studio_id,
            "runtimeId": input.runtime_id,
            "proxyName": input.proxy_name,
            "proxyType": match input.proxy_type {
                Some(ref pt) => serde_json::to_value(pt)?,
                None => serde_json::json!("http"),
            },
            "localIP": input.local_ip.unwrap_or_else(|| "127.0.0.1".into()),
            "localPort": input.local_port,
            "remotePort": input.remote_port,
            "frpcClientId": input.frpc_client_id,
            "enabled": input.enabled.unwrap_or(true),
            "updatedAt": now,
        });

        let proxy: WorkspaceProxy = if let Some(existing_proxy) = existing.into_iter().next() {
            let existing_id = record_id_string(&existing_proxy.id);
            // Update existing
            let created = existing_proxy.created_at;
            let mut content = proxy_content;
            content["createdAt"] = serde_json::json!(created);
            self.db
                .query("UPDATE $id MERGE $content")
                .bind(("id", &existing_id))
                .bind(("content", &content))
                .await?;
            // Re-fetch
            let updated: Vec<WorkspaceProxy> = self
                .query_rows(
                    "SELECT * FROM workspace_proxy WHERE proxyName = $proxyName LIMIT 1",
                    serde_json::json!({ "proxyName": &input.proxy_name }),
                )
                .await?;
            updated.into_iter().next().unwrap()
        } else {
            // Create new
            let mut content = proxy_content;
            content["createdAt"] = serde_json::json!(now);
            let created: Option<WorkspaceProxy> = self
                .db
                .create("workspace_proxy")
                .content(content)
                .await?;
            created.unwrap()
        };

        let proxy_id = record_id_string(&proxy.id);

        // Build host list
        let mut hosts: Vec<(String, DomainKind)> = Vec::new();
        if let Some(ref sub) = input.subdomain {
            let host = format!("{}.dlx.studio", sub); // default subdomain pattern
            hosts.push((host, DomainKind::Subdomain));
        }
        if let Some(ref customs) = input.custom_domains {
            for raw_host in customs {
                let normalized = normalize_host(raw_host);
                hosts.push((normalized, DomainKind::Custom));
            }
        }

        let mut resolutions = Vec::new();
        for (host, kind) in hosts {
            // Check existing domain
            let existing_domains: Vec<ProxyDomain> = self
                .query_rows(
                    "SELECT * FROM proxy_domain WHERE host = $host LIMIT 1",
                    serde_json::json!({ "host": &host }),
                )
                .await?;

            let existing_domain = existing_domains.into_iter().next();

            let status = match kind {
                DomainKind::Subdomain => DomainStatus::Active,
                DomainKind::Custom => existing_domain
                    .as_ref()
                    .map(|d| d.status.clone())
                    .unwrap_or(DomainStatus::Pending),
            };

            let verification_token = match kind {
                DomainKind::Custom => Some(
                    existing_domain
                        .as_ref()
                        .and_then(|d| d.verification_token.clone())
                        .unwrap_or_else(generate_token),
                ),
                DomainKind::Subdomain => None,
            };

            let domain_content = serde_json::json!({
                "host": &host,
                "proxyId": &proxy_id,
                "kind": match kind {
                    DomainKind::Subdomain => "subdomain",
                    DomainKind::Custom => "custom",
                },
                "status": status.to_string(),
                "verificationToken": verification_token,
                "updatedAt": now,
            });

            let saved_domain: ProxyDomain = if let Some(existing) = existing_domain {
                let existing_id = record_id_string(&existing.id);
                let mut content = domain_content;
                content["createdAt"] = serde_json::json!(existing.created_at);
                self.db
                    .query("UPDATE $id MERGE $content")
                    .bind(("id", &existing_id))
                    .bind(("content", &content))
                    .await?;
                let fetched: Vec<ProxyDomain> = self
                    .query_rows(
                        "SELECT * FROM proxy_domain WHERE host = $host LIMIT 1",
                        serde_json::json!({ "host": &host }),
                    )
                    .await?;
                fetched.into_iter().next().unwrap()
            } else {
                let mut content = domain_content;
                content["createdAt"] = serde_json::json!(now);
                let created: Option<ProxyDomain> = self
                    .db
                    .create("proxy_domain")
                    .content(content)
                    .await?;
                created.unwrap()
            };

            resolutions.push(DomainResolution {
                proxy: proxy.clone(),
                domain: saved_domain,
            });
        }

        Ok(resolutions)
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
        let now = chrono::Utc::now().timestamp_millis();

        let domains: Vec<ProxyDomain> = self
            .query_rows(
                "SELECT * FROM proxy_domain WHERE host = $host LIMIT 1",
                serde_json::json!({ "host": &normalized }),
            )
            .await?;

        let domain = match domains.into_iter().next() {
            Some(d) => d,
            None => return Ok(None),
        };

        let domain_id = record_id_string(&domain.id);
        self.db
            .query("UPDATE $id MERGE { status: $status, updatedAt: $now }")
            .bind(("id", &domain_id))
            .bind(("status", status.to_string()))
            .bind(("now", now))
            .await?;

        // Re-fetch
        self.get_domain_by_host(&normalized).await
    }

    async fn remove_domain(&self, host: &str, _studio_id: Option<&str>) -> Result<bool> {
        let normalized = normalize_host(host);

        let domains: Vec<ProxyDomain> = self
            .query_rows(
                "SELECT * FROM proxy_domain WHERE host = $host LIMIT 1",
                serde_json::json!({ "host": &normalized }),
            )
            .await?;

        let domain = match domains.into_iter().next() {
            Some(d) => d,
            None => return Ok(false),
        };

        let domain_id = record_id_string(&domain.id);
        self.db.query("DELETE $id").bind(("id", &domain_id)).await?;
        Ok(true)
    }

    async fn disable_proxy(&self, name: &str) -> Result<()> {
        let now = chrono::Utc::now().timestamp_millis();
        self.db
            .query(
                "UPDATE workspace_proxy SET enabled = false, updatedAt = $now WHERE proxyName = $proxyName",
            )
            .bind(("proxyName", name.to_string()))
            .bind(("now", now))
            .await?;
        Ok(())
    }
}

// ── Helpers ─────────────────────────────────────────────────────────

impl SurrealStore {
    /// Fetch a proxy by its record ID string (e.g. "workspace_proxy:my-proxy").
    async fn fetch_proxy_by_record_id(&self, record_id: &str) -> Result<Option<WorkspaceProxy>> {
        // Parse "table:id" and select
        let parts: Vec<&str> = record_id.splitn(2, ':').collect();
        if parts.len() != 2 {
            return Ok(None);
        }
        let result: Option<WorkspaceProxy> = self
            .db
            .select((parts[0], parts[1]))
            .await?;
        Ok(result)
    }
}

fn normalize_host(host: &str) -> String {
    host.trim()
        .trim_end_matches('.')
        .to_lowercase()
}

fn generate_token() -> String {
    use std::fmt::Write;
    let bytes: [u8; 16] = rand::random();
    let mut s = String::with_capacity(32);
    for b in &bytes {
        write!(&mut s, "{b:02x}").unwrap();
    }
    s
}

/// Extract a "table:id" string from a SurrealDB JSON id value.
fn record_id_string(id: &Option<serde_json::Value>) -> String {
    match id {
        Some(serde_json::Value::String(s)) => s.clone(),
        Some(serde_json::Value::Object(map)) => {
            let tb = map.get("tb").and_then(|v| v.as_str()).unwrap_or("");
            let id_val = map
                .get("id")
                .and_then(|v| {
                    v.as_str()
                        .or_else(|| v.get("String").and_then(|s| s.as_str()))
                        .unwrap_or("")
                })
                .unwrap_or("");
            format!("{tb}:{id_val}")
        }
        _ => String::new(),
    }
}

// ── Integration Tests ───────────────────────────────────────────────
// These require a running SurrealDB instance. Mark with #[ignore] so
// `cargo test` skips them by default. Run with `cargo test -- --ignored`.

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper to connect to a local SurrealDB for integration tests.
    /// Set SURREAL_URL, SURREAL_NS, SURREAL_DB env vars to override.
    async fn test_db() -> Surreal<Client> {
        let url = std::env::var("SURREAL_TEST_URL")
            .unwrap_or_else(|_| "ws://127.0.0.1:8000/rpc".into());
        let ns = std::env::var("SURREAL_TEST_NS").unwrap_or_else(|_| "test".into());
        let db_name = std::env::var("SURREAL_TEST_DB").unwrap_or_else(|_| "edge_test".into());

        let db = Surreal::new::<surrealdb::engine::remote::ws::Ws>(&url)
            .await
            .expect("connect to SurrealDB");
        db.use_ns(&ns)
            .use_db(&db_name)
            .await
            .expect("use namespace/database");
        db
    }

    async fn setup_store() -> SurrealStore {
        let db = test_db().await;
        // Clean up existing data
        db.query("DELETE proxy_domain").await.unwrap();
        db.query("DELETE workspace_proxy").await.unwrap();
        let store = SurrealStore::new(db);
        store.ensure_schema().await.unwrap();
        store
    }

    #[tokio::test]
    #[ignore]
    async fn integration_health() {
        let store = setup_store().await;
        let h = store.health().await.unwrap();
        assert!(h.ok);
    }

    #[tokio::test]
    #[ignore]
    async fn integration_upsert_and_resolve() {
        let store = setup_store().await;

        let results = store
            .upsert_proxy(ProxyUpsertInput {
                user_id: "u1".into(),
                studio_id: "s1".into(),
                runtime_id: None,
                proxy_name: "integration-test-proxy".into(),
                proxy_type: Some(ProxyType::Http),
                local_ip: Some("10.0.0.5".into()),
                local_port: 3000,
                remote_port: None,
                frpc_client_id: None,
                enabled: Some(true),
                subdomain: Some("myapp".into()),
                custom_domains: Some(vec!["integration-test.example".into()]),
            })
            .await
            .unwrap();

        assert_eq!(results.len(), 2); // 1 subdomain + 1 custom

        // Subdomain should auto-activate
        let resolved = store
            .resolve_host("myapp.dlx.studio")
            .await
            .unwrap()
            .unwrap();
        assert_eq!(resolved.domain.status, DomainStatus::Active);
        assert_eq!(resolved.proxy.proxy_name, "integration-test-proxy");

        // Custom domain should be pending
        let custom = store
            .get_domain_by_host("integration-test.example")
            .await
            .unwrap()
            .unwrap();
        assert_eq!(custom.domain.status, DomainStatus::Pending);
        assert!(custom.domain.verification_token.is_some());
    }

    #[tokio::test]
    #[ignore]
    async fn integration_set_domain_status() {
        let store = setup_store().await;

        store
            .upsert_proxy(ProxyUpsertInput {
                user_id: "u1".into(),
                studio_id: "s1".into(),
                runtime_id: None,
                proxy_name: "status-test".into(),
                proxy_type: None,
                local_ip: None,
                local_port: 3000,
                remote_port: None,
                frpc_client_id: None,
                enabled: None,
                subdomain: None,
                custom_domains: Some(vec!["status-test.example".into()]),
            })
            .await
            .unwrap();

        let updated = store
            .set_domain_status("status-test.example", "active")
            .await
            .unwrap()
            .unwrap();
        assert_eq!(updated.domain.status, DomainStatus::Active);
    }

    #[tokio::test]
    #[ignore]
    async fn integration_disable_proxy() {
        let store = setup_store().await;

        store
            .upsert_proxy(ProxyUpsertInput {
                user_id: "u1".into(),
                studio_id: "s1".into(),
                runtime_id: None,
                proxy_name: "disable-test".into(),
                proxy_type: None,
                local_ip: None,
                local_port: 3000,
                remote_port: None,
                frpc_client_id: None,
                enabled: Some(true),
                subdomain: Some("disableme".into()),
                custom_domains: None,
            })
            .await
            .unwrap();

        // Resolve should work (active subdomain + enabled proxy)
        let res = store.resolve_host("disableme.dlx.studio").await.unwrap();
        assert!(res.is_some());

        store.disable_proxy("disable-test").await.unwrap();

        // Now resolve should return None (proxy disabled)
        let res = store.resolve_host("disableme.dlx.studio").await.unwrap();
        assert!(res.is_none());
    }

    #[tokio::test]
    #[ignore]
    async fn integration_remove_domain() {
        let store = setup_store().await;

        store
            .upsert_proxy(ProxyUpsertInput {
                user_id: "u1".into(),
                studio_id: "s1".into(),
                runtime_id: None,
                proxy_name: "remove-test".into(),
                proxy_type: None,
                local_ip: None,
                local_port: 3000,
                remote_port: None,
                frpc_client_id: None,
                enabled: None,
                subdomain: None,
                custom_domains: Some(vec!["remove-test.example".into()]),
            })
            .await
            .unwrap();

        assert!(store.remove_domain("remove-test.example", None).await.unwrap());
        assert!(!store.remove_domain("remove-test.example", None).await.unwrap());
    }
}
