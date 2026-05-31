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
use surrealdb::Connection;

use crate::store::DomainStore;
use crate::types::*;
use crate::helpers::*;
use crate::surreal_ext::SurrealExt;
use crate::store_config::StoreSchemaConfig;

pub struct SurrealStore<C: Connection> {
    db: Surreal<C>,
    schema: StoreSchemaConfig,
}

impl<C: Connection> SurrealStore<C> {
    pub fn new(db: Surreal<C>, schema: StoreSchemaConfig) -> Self {
        Self { db, schema }
    }
}

#[async_trait]
impl<C: Connection + Send + Sync> DomainStore for SurrealStore<C> {
    async fn ensure_schema(&self) -> Result<()> {
        for stmt in crate::schema::studio_parse_statements() {
            self.db.query(stmt).await?;
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
            .db
            .query_rows(
                &format!("SELECT * FROM {} WHERE host = $host AND status = 'active' LIMIT 1", self.schema.domain_table),
                serde_json::json!({ "host": normalized }),
            )
            .await?;

        let domain = match domains.into_iter().next() {
            Some(d) => d,
            None => return Ok(None),
        };

        let proxy = self.db.select_by_record_id::<WorkspaceProxy>(&domain.proxy_id).await?;
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
            .db
            .query_rows(
                &format!("SELECT * FROM {} WHERE host = $host LIMIT 1", self.schema.domain_table),
                serde_json::json!({ "host": normalized }),
            )
            .await?;

        let domain = match domains.into_iter().next() {
            Some(d) => d,
            None => return Ok(None),
        };

        let proxy = self.db.select_by_record_id::<WorkspaceProxy>(&domain.proxy_id).await?;
        let Some(proxy) = proxy else {
            return Ok(None);
        };

        Ok(Some(DomainResolution { proxy, domain }))
    }

    async fn list_domains_for_studio(&self, studio_id: &str) -> Result<Vec<DomainResolution>> {
        let proxies: Vec<WorkspaceProxy> = self
            .db
            .query_rows(
                &format!("SELECT * FROM {} WHERE studioId = $studioId ORDER BY updatedAt DESC", self.schema.proxy_table),
                serde_json::json!({ "studioId": studio_id }),
            )
            .await?;

        let mut results = Vec::new();
        for proxy in &proxies {
            let proxy_id = record_id_string(&proxy.id);
            let domains: Vec<ProxyDomain> = self
                .db
                .query_rows(
                    &format!("SELECT * FROM {} WHERE proxyId = $proxyId ORDER BY updatedAt DESC", self.schema.domain_table),
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
            .db
            .query_rows(
                &format!("SELECT * FROM {} WHERE proxyName = $proxyName AND enabled = true LIMIT 1", self.schema.proxy_table),
                serde_json::json!({ "proxyName": name }),
            )
            .await?;
        Ok(proxies.into_iter().next())
    }

    async fn list_proxy_domains(&self, name: &str) -> Result<Vec<DomainResolution>> {
        let proxies: Vec<WorkspaceProxy> = self
            .db
            .query_rows(
                &format!("SELECT * FROM {} WHERE proxyName = $proxyName LIMIT 1", self.schema.proxy_table),
                serde_json::json!({ "proxyName": name }),
            )
            .await?;

        let proxy = match proxies.into_iter().next() {
            Some(p) => p,
            None => return Ok(vec![]),
        };

        let proxy_id = record_id_string(&proxy.id);
        let domains: Vec<ProxyDomain> = self
            .db
            .query_rows(
                &format!("SELECT * FROM {} WHERE proxyId = $proxyId", self.schema.domain_table),
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
            .db
            .query_rows(
                &format!("SELECT * FROM {} WHERE proxyName = $proxyName LIMIT 1", self.schema.proxy_table),
                serde_json::json!({ "proxyName": &input.proxy_name }),
            )
            .await?;

        let proxy_type_str = input.proxy_type.unwrap_or_default().to_string();

        let mut proxy_content = serde_json::json!({
            "userId": input.user_id,
            "studioId": input.studio_id,
            "proxyName": input.proxy_name,
            "proxyType": proxy_type_str,
            "localIP": input.local_ip.unwrap_or_else(|| "127.0.0.1".into()),
            "localPort": input.local_port,
            "enabled": input.enabled.unwrap_or(true),
            "updatedAt": now,
        });
        if let Some(v) = &input.runtime_id {
            proxy_content["runtimeId"] = serde_json::json!(v);
        }
        if let Some(v) = input.remote_port {
            proxy_content["remotePort"] = serde_json::json!(v);
        }
        if let Some(v) = &input.frpc_client_id {
            proxy_content["frpcClientId"] = serde_json::json!(v);
        }

        let proxy: WorkspaceProxy = if let Some(existing_proxy) = existing.into_iter().next() {
            let existing_id = record_id_string(&existing_proxy.id);
            let mut content = proxy_content.clone();
            content["createdAt"] = serde_json::json!(existing_proxy.created_at);
            self.db
                .query("UPDATE type::record($id) MERGE $content")
                .bind(serde_json::json!({
                    "id": existing_id,
                    "content": content,
                }))
                .await?;

            let updated: Vec<WorkspaceProxy> = self
                .db
                .query_rows(
                    &format!("SELECT * FROM {} WHERE proxyName = $proxyName LIMIT 1", self.schema.proxy_table),
                    serde_json::json!({ "proxyName": &input.proxy_name }),
                )
                .await?;
            updated.into_iter().next().unwrap()
        } else {
            let mut content = proxy_content;
            content["createdAt"] = serde_json::json!(now);
            self.db.create_record(&self.schema.proxy_table, content).await?
        };

        let proxy_id = record_id_string(&proxy.id);

        // Build host list
        let mut hosts: Vec<(String, DomainKind)> = Vec::new();
        if let Some(ref sub) = input.subdomain {
            let host = self.schema.subdomain_host(sub);
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
                .db
                .query_rows(
                    &format!("SELECT * FROM {} WHERE host = $host LIMIT 1", self.schema.domain_table),
                    serde_json::json!({ "host": &host }),
                )
                .await?;

            let existing_domain = existing_domains.into_iter().next();

            let status = match kind {
                DomainKind::Subdomain => kind.initial_status(),
                DomainKind::Custom => existing_domain
                    .as_ref()
                    .map(|d| d.status.clone())
                    .unwrap_or_else(|| kind.initial_status()),
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

            let kind_str = kind.to_string();

            let mut domain_content = serde_json::json!({
                "host": &host,
                "proxyId": &proxy_id,
                "kind": kind_str,
                "status": status.to_string(),
                "updatedAt": now,
            });
            if let Some(token) = &verification_token {
                domain_content["verificationToken"] = serde_json::json!(token);
            }

            let saved_domain: ProxyDomain = if let Some(existing) = existing_domain {
                let existing_id = record_id_string(&existing.id);
                let mut content = domain_content.clone();
                content["createdAt"] = serde_json::json!(existing.created_at);
                self.db
                    .query("UPDATE type::record($id) MERGE $content")
                    .bind(serde_json::json!({
                        "id": existing_id,
                        "content": content,
                    }))
                    .await?;

                let fetched: Vec<ProxyDomain> = self
                    .db
                    .query_rows(
                        &format!("SELECT * FROM {} WHERE host = $host LIMIT 1", self.schema.domain_table),
                        serde_json::json!({ "host": &host }),
                    )
                    .await?;
                fetched.into_iter().next().unwrap()
            } else {
                let mut content = domain_content;
                content["createdAt"] = serde_json::json!(now);
                self.db.create_record(&self.schema.domain_table, content).await?
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
            .db
            .query_rows(
                &format!("SELECT * FROM {} WHERE host = $host LIMIT 1", self.schema.domain_table),
                serde_json::json!({ "host": &normalized }),
            )
            .await?;

        let domain = match domains.into_iter().next() {
            Some(d) => d,
            None => return Ok(None),
        };

        let domain_id = record_id_string(&domain.id);
        self.db
            .query("UPDATE type::record($id) MERGE { status: $status, updatedAt: $now }")
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
            .db
            .query_rows(
                &format!("SELECT * FROM {} WHERE host = $host LIMIT 1", self.schema.domain_table),
                serde_json::json!({ "host": &normalized }),
            )
            .await?;

        let domain = match domains.into_iter().next() {
            Some(d) => d,
            None => return Ok(false),
        };

        let domain_id = record_id_string(&domain.id);
        self.db
            .query("DELETE type::record($id)")
            .bind(serde_json::json!({ "id": domain_id }))
            .await?;
        Ok(true)
    }

    async fn disable_proxy(&self, name: &str) -> Result<()> {
        let now = chrono::Utc::now().timestamp_millis();
        self.db
            .query(&format!(
                "UPDATE {} SET enabled = false, updatedAt = $now WHERE proxyName = $proxyName",
                self.schema.proxy_table,
            ))
            .bind(serde_json::json!({
                "proxyName": name,
                "now": now,
            }))
            .await?;
        Ok(())
    }
}

// ── Integration Tests ───────────────────────────────────────────────
// Require running SurrealDB. Run with: cargo test -p edge-store -- --ignored

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::DomainStore;

    async fn test_db() -> Surreal<surrealdb::engine::remote::http::Client> {
        use surrealdb::opt::auth::Root;

        let url = std::env::var("SURREAL_TEST_URL")
            .unwrap_or_else(|_| "127.0.0.1:8000".into());
        let ns = std::env::var("SURREAL_TEST_NS").unwrap_or_else(|_| "test".into());
        let db_name = std::env::var("SURREAL_TEST_DB").unwrap_or_else(|_| "edge_test".into());
        let user = std::env::var("SURREAL_TEST_USER").unwrap_or_else(|_| "root".into());
        let pass = std::env::var("SURREAL_TEST_PASS").unwrap_or_else(|_| "root".into());

        let db = Surreal::new::<surrealdb::engine::remote::http::Http>(&url)
            .await
            .expect("connect to SurrealDB");
        db.signin(Root {
            username: user,
            password: pass,
        })
        .await
        .expect("signin to SurrealDB");
        db.use_ns(&ns)
            .use_db(&db_name)
            .await
            .expect("use namespace/database");
        db
    }

    async fn setup_store() -> SurrealStore<surrealdb::engine::remote::http::Client> {
        let db = test_db().await;
        db.query("DELETE proxy_domain").await.unwrap();
        db.query("DELETE workspace_proxy").await.unwrap();
        let store = SurrealStore::new(db, StoreSchemaConfig::studio());
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
