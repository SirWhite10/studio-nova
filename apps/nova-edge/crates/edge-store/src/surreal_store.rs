//! SurrealStore — SurrealDB-backed DomainStore implementation.
//!
//! Query patterns mirror the TypeScript `nova-domain-control` store exactly,
//! using the same SurrealQL and camelCase field names.
//!
//! All SurrealDB API interactions go through `serde_json::Value` to avoid
//! requiring `SurrealValue` derive on our domain types.

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

    /// Run a query that returns the first result set as Vec<T>.
    async fn query_rows<T: serde::de::DeserializeOwned>(
        &self,
        sql: &str,
        vars: serde_json::Value,
    ) -> Result<Vec<T>> {
        let mut response = self.db.query(sql).bind(vars).await?;
        let raw: Vec<serde_json::Value> = response.take(0)?;
        let rows: Vec<T> = raw
            .into_iter()
            .filter_map(|v| serde_json::from_value(v).ok())
            .collect();
        Ok(rows)
    }

    /// Create a record in `table` with JSON content, returning the created row as T.
    async fn create_record<T: serde::de::DeserializeOwned>(
        &self,
        table: &str,
        content: serde_json::Value,
    ) -> Result<T> {
        let sql = "CREATE type::thing($table, rand::uuid()) CONTENT $content";
        let mut response = self
            .db
            .query(sql)
            .bind(serde_json::json!({
                "table": table,
                "content": content,
            }))
            .await?;
        let raw: Vec<serde_json::Value> = response.take(0)?;
        let row: T = raw
            .into_iter()
            .filter_map(|v| serde_json::from_value(v).ok())
            .next()
            .ok_or_else(|| anyhow::anyhow!("create returned no rows"))?;
        Ok(row)
    }

    /// Select a record by table:id string.
    async fn select_record<T: serde::de::DeserializeOwned>(
        &self,
        record_id: &str,
    ) -> Result<Option<T>> {
        let parts: Vec<&str> = record_id.splitn(2, ':').collect();
        if parts.len() != 2 {
            return Ok(None);
        }
        let mut response = self
            .db
            .query("SELECT * FROM type::thing($tb, $id)")
            .bind(serde_json::json!({
                "tb": parts[0],
                "id": parts[1],
            }))
            .await?;
        let raw: Vec<serde_json::Value> = response.take(0)?;
        Ok(raw
            .into_iter()
            .filter_map(|v| serde_json::from_value(v).ok())
            .next())
    }
}

// ── Schema ──────────────────────────────────────────────────────────

pub const SCHEMA_DDL: &[&str] = &[
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
        let result: Option<serde_json::Value> = self
            .db
            .query("RETURN true")
            .await?
            .take(0)?;
        Ok(StoreHealth {
            ok: result == Some(serde_json::Value::Bool(true)),
            message: Some("surrealdb connected".into()),
        })
    }

    async fn resolve_host(&self, host: &str) -> Result<Option<DomainResolution>> {
        let normalized = normalize_host(host);

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

        let proxy = self.select_record::<WorkspaceProxy>(&domain.proxy_id).await?;
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

        let proxy = self.select_record::<WorkspaceProxy>(&domain.proxy_id).await?;
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
        for proxy in &proxies {
            let proxy_id = record_id_string(&proxy.id);
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

        let existing: Vec<WorkspaceProxy> = self
            .query_rows(
                "SELECT * FROM workspace_proxy WHERE proxyName = $proxyName LIMIT 1",
                serde_json::json!({ "proxyName": &input.proxy_name }),
            )
            .await?;

        let proxy_type_str = match &input.proxy_type {
            Some(ProxyType::Http) => "http",
            Some(ProxyType::Https) => "https",
            Some(ProxyType::Tcp) => "tcp",
            Some(ProxyType::Udp) => "udp",
            None => "http",
        };

        let proxy: WorkspaceProxy = if let Some(existing_proxy) = existing.into_iter().next() {
            let existing_id = record_id_string(&existing_proxy.id);
            let created = existing_proxy.created_at;
            self.db
                .query("UPDATE type::thing($id) MERGE $content")
                .bind(serde_json::json!({
                    "id": existing_id,
                    "content": {
                        "userId": input.user_id,
                        "studioId": input.studio_id,
                        "runtimeId": input.runtime_id,
                        "proxyName": input.proxy_name,
                        "proxyType": proxy_type_str,
                        "localIP": input.local_ip.unwrap_or_else(|| "127.0.0.1".into()),
                        "localPort": input.local_port,
                        "remotePort": input.remote_port,
                        "frpcClientId": input.frpc_client_id,
                        "enabled": input.enabled.unwrap_or(true),
                        "createdAt": created,
                        "updatedAt": now,
                    }
                }))
                .await?;

            let updated: Vec<WorkspaceProxy> = self
                .query_rows(
                    "SELECT * FROM workspace_proxy WHERE proxyName = $proxyName LIMIT 1",
                    serde_json::json!({ "proxyName": &input.proxy_name }),
                )
                .await?;
            updated.into_iter().next().unwrap()
        } else {
            self.create_record(
                "workspace_proxy",
                serde_json::json!({
                    "userId": input.user_id,
                    "studioId": input.studio_id,
                    "runtimeId": input.runtime_id,
                    "proxyName": input.proxy_name,
                    "proxyType": proxy_type_str,
                    "localIP": input.local_ip.unwrap_or_else(|| "127.0.0.1".into()),
                    "localPort": input.local_port,
                    "remotePort": input.remote_port,
                    "frpcClientId": input.frpc_client_id,
                    "enabled": input.enabled.unwrap_or(true),
                    "createdAt": now,
                    "updatedAt": now,
                }),
            )
            .await?
        };

        let proxy_id = record_id_string(&proxy.id);

        // Build host list
        let mut hosts: Vec<(String, DomainKind)> = Vec::new();
        if let Some(ref sub) = input.subdomain {
            let host = format!("{}.dlx.studio", sub);
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

            let kind_str = match kind {
                DomainKind::Subdomain => "subdomain",
                DomainKind::Custom => "custom",
            };

            let saved_domain: ProxyDomain = if let Some(existing) = existing_domain {
                let existing_id = record_id_string(&existing.id);
                self.db
                    .query("UPDATE type::thing($id) MERGE $content")
                    .bind(serde_json::json!({
                        "id": existing_id,
                        "content": {
                            "host": &host,
                            "proxyId": &proxy_id,
                            "kind": kind_str,
                            "status": status.to_string(),
                            "verificationToken": verification_token,
                            "createdAt": existing.created_at,
                            "updatedAt": now,
                        }
                    }))
                    .await?;

                let fetched: Vec<ProxyDomain> = self
                    .query_rows(
                        "SELECT * FROM proxy_domain WHERE host = $host LIMIT 1",
                        serde_json::json!({ "host": &host }),
                    )
                    .await?;
                fetched.into_iter().next().unwrap()
            } else {
                self.create_record(
                    "proxy_domain",
                    serde_json::json!({
                        "host": &host,
                        "proxyId": &proxy_id,
                        "kind": kind_str,
                        "status": status.to_string(),
                        "verificationToken": verification_token,
                        "createdAt": now,
                        "updatedAt": now,
                    }),
                )
                .await?
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
            .query("UPDATE type::thing($id) MERGE { status: $status, updatedAt: $now }")
            .bind(serde_json::json!({
                "id": domain_id,
                "status": status.to_string(),
                "now": now,
            }))
            .await?;

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
        self.db
            .query("DELETE type::thing($id)")
            .bind(serde_json::json!({ "id": domain_id }))
            .await?;
        Ok(true)
    }

    async fn disable_proxy(&self, name: &str) -> Result<()> {
        let now = chrono::Utc::now().timestamp_millis();
        self.db
            .query(
                "UPDATE workspace_proxy SET enabled = false, updatedAt = $now WHERE proxyName = $proxyName",
            )
            .bind(serde_json::json!({
                "proxyName": name,
                "now": now,
            }))
            .await?;
        Ok(())
    }
}

// ── Helpers ─────────────────────────────────────────────────────────

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
            let id_part = map.get("id");
            let id_str = match id_part {
                Some(serde_json::Value::String(s)) => s.clone(),
                Some(serde_json::Value::Object(id_map)) => id_map
                    .get("String")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                Some(serde_json::Value::Number(n)) => n.to_string(),
                _ => String::new(),
            };
            if tb.is_empty() || id_str.is_empty() {
                String::new()
            } else {
                format!("{tb}:{id_str}")
            }
        }
        _ => String::new(),
    }
}

// ── Integration Tests ───────────────────────────────────────────────
// Require running SurrealDB. Run with: cargo test -p edge-store -- --ignored

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::DomainStore;

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
                proxy_name: "int-test-proxy".into(),
                proxy_type: Some(ProxyType::Http),
                local_ip: Some("10.0.0.5".into()),
                local_port: 3000,
                remote_port: None,
                frpc_client_id: None,
                enabled: Some(true),
                subdomain: Some("myapp".into()),
                custom_domains: Some(vec!["int-test.example".into()]),
            })
            .await
            .unwrap();

        assert_eq!(results.len(), 2);

        let resolved = store
            .resolve_host("myapp.dlx.studio")
            .await
            .unwrap()
            .unwrap();
        assert_eq!(resolved.domain.status, DomainStatus::Active);

        let custom = store
            .get_domain_by_host("int-test.example")
            .await
            .unwrap()
            .unwrap();
        assert_eq!(custom.domain.status, DomainStatus::Pending);
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

        assert!(store.resolve_host("disableme.dlx.studio").await.unwrap().is_some());
        store.disable_proxy("disable-test").await.unwrap();
        assert!(store.resolve_host("disableme.dlx.studio").await.unwrap().is_none());
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
