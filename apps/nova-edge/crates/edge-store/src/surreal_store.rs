//! SurrealStore — SurrealDB-backed DomainStore implementation.
//!
//! Query patterns mirror the TypeScript `nova-domain-control` store exactly,
//! using the same SurrealQL and camelCase field names.
//!
//! All SurrealDB API interactions go through `serde_json::Value` to avoid
//! requiring `SurrealValue` derive on our domain types.

use anyhow::Result;
use async_trait::async_trait;
use surrealdb::Connection;
use surrealdb::Surreal;

use crate::helpers::*;
use crate::store::DomainStore;
use crate::store_config::StoreSchemaConfig;
use crate::surreal_ext::SurrealExt;
use crate::types::*;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct DomainBindingRecord {
    id: Option<serde_json::Value>,
    user_id: String,
    studio_id: serde_json::Value,
    host: String,
    ownership_status: String,
    certificate_status: String,
    verification_token: Option<String>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeploymentRouteRecord {
    domain_binding_id: serde_json::Value,
    deployment_id: serde_json::Value,
    horizon_node_id: serde_json::Value,
    tunnel_connector_id: serde_json::Value,
    status: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeploymentRecord {
    id: Option<serde_json::Value>,
    user_id: String,
    studio_id: serde_json::Value,
    status: String,
    active_runtime_instance_id: Option<serde_json::Value>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeInstanceRecord {
    id: Option<serde_json::Value>,
    deployment_id: serde_json::Value,
    node_id: serde_json::Value,
    status: String,
    service_key: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct TunnelConnectorRecord {
    constellation_id: serde_json::Value,
    habitat_node_id: serde_json::Value,
    horizon_node_id: serde_json::Value,
    connector_key: String,
    status: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct InfrastructureNodeRecord {
    id: Option<serde_json::Value>,
    constellation_id: serde_json::Value,
    role: String,
    status: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct NodeReadinessRecord {
    role: String,
    status: String,
    heartbeat_fresh: bool,
}

#[derive(serde::Deserialize)]
struct StatusRecord {
    status: String,
}

fn value_record_id(value: &serde_json::Value) -> String {
    record_id_string(&Some(value.clone()))
}

fn records_match(left: &serde_json::Value, right: &str) -> bool {
    value_record_id(left) == right
}

fn tenant_records_match(
    domain_user: &str,
    domain_studio: &serde_json::Value,
    deployment_user: &str,
    deployment_studio: &serde_json::Value,
) -> bool {
    domain_user == deployment_user
        && value_record_id(domain_studio) == value_record_id(deployment_studio)
}

fn split_service_key(service_key: &str) -> Option<(String, u16)> {
    let (host, port) = service_key.rsplit_once(':')?;
    let port = port.parse().ok()?;
    if host.is_empty() || port == 0 {
        return None;
    }
    Some((host.to_string(), port))
}

fn prefixed_record_id(table: &str, value: &str) -> String {
    if value.contains(':') {
        value.to_string()
    } else {
        format!("{table}:{value}")
    }
}

pub struct SurrealStore<C: Connection> {
    db: Surreal<C>,
    schema: StoreSchemaConfig,
    versioned_schema: bool,
}

impl<C: Connection> SurrealStore<C> {
    pub fn new(db: Surreal<C>, schema: StoreSchemaConfig) -> Self {
        Self {
            db,
            schema,
            versioned_schema: true,
        }
    }

    pub fn with_schema_mode(
        db: Surreal<C>,
        schema: StoreSchemaConfig,
        versioned_schema: bool,
    ) -> Self {
        Self {
            db,
            schema,
            versioned_schema,
        }
    }
}

#[async_trait]
impl<C: Connection + Send + Sync> DomainStore for SurrealStore<C> {
    async fn health(&self) -> Result<StoreHealth> {
        let result: Option<serde_json::Value> = self.db.query("RETURN true").await?.take(0)?;
        Ok(StoreHealth {
            ok: result == Some(serde_json::Value::Bool(true)),
            message: Some("surrealdb connected".into()),
        })
    }

    async fn readiness(&self) -> Result<serde_json::Value> {
        if !self.versioned_schema {
            return Ok(serde_json::json!({
                "ok": true,
                "schema": { "mode": "legacy", "ok": true },
                "nodes": { "ok": true, "skipped": true },
                "tunnel": { "ok": true, "skipped": true },
                "runtime": { "ok": true, "skipped": true },
                "route": { "ok": true, "skipped": true }
            }));
        }
        let nodes: Vec<NodeReadinessRecord> = self
            .db
            .query_rows(
                "SELECT role, status, lastHeartbeatAt != NONE AND lastHeartbeatAt > time::now() - 2m AS heartbeatFresh FROM infrastructure_node WHERE status != 'retired'",
                serde_json::json!({}),
            )
            .await?;
        let connectors: Vec<StatusRecord> = self
            .db
            .query_rows("SELECT status FROM tunnel_connector", serde_json::json!({}))
            .await?;
        let runtimes: Vec<StatusRecord> = self
            .db
            .query_rows("SELECT status FROM runtime_instance", serde_json::json!({}))
            .await?;
        let routes: Vec<StatusRecord> = self
            .db
            .query_rows("SELECT status FROM deployment_route", serde_json::json!({}))
            .await?;
        let role_ready = |role: &str| {
            nodes.iter().any(|node| {
                node.role == role
                    && node.heartbeat_fresh
                    && matches!(node.status.as_str(), "online" | "degraded")
            })
        };
        let nodes_ok = ["forge", "horizon", "habitat"]
            .iter()
            .all(|role| role_ready(role));
        let tunnel_ok = connectors.iter().any(|row| row.status == "online");
        let runtime_ok = !runtimes
            .iter()
            .any(|row| matches!(row.status.as_str(), "unhealthy" | "failed"));
        let route_ok = !routes
            .iter()
            .any(|row| matches!(row.status.as_str(), "degraded" | "failed"));
        Ok(serde_json::json!({
            "ok": nodes_ok && tunnel_ok && runtime_ok && route_ok,
            "schema": { "mode": "versioned", "ok": true },
            "nodes": {
                "ok": nodes_ok,
                "readyByRole": {
                    "forge": role_ready("forge"),
                    "horizon": role_ready("horizon"),
                    "habitat": role_ready("habitat")
                }
            },
            "tunnel": {
                "ok": tunnel_ok,
                "online": connectors.iter().filter(|row| row.status == "online").count()
            },
            "runtime": {
                "ok": runtime_ok,
                "healthy": runtimes.iter().filter(|row| row.status == "healthy").count(),
                "unhealthy": runtimes.iter().filter(|row| matches!(row.status.as_str(), "unhealthy" | "failed")).count()
            },
            "route": {
                "ok": route_ok,
                "active": routes.iter().filter(|row| row.status == "active").count(),
                "degraded": routes.iter().filter(|row| matches!(row.status.as_str(), "degraded" | "failed")).count()
            }
        }))
    }

    async fn get_domain_binding_verification(
        &self,
        host: &str,
    ) -> Result<Option<DomainBindingVerification>> {
        if !self.versioned_schema {
            return Ok(None);
        }
        let normalized = normalize_host(host);
        let rows: Vec<DomainBindingRecord> = self
            .db
            .query_rows(
                "SELECT * FROM domain_binding WHERE host = $host LIMIT 1",
                serde_json::json!({ "host": normalized }),
            )
            .await?;
        Ok(rows
            .into_iter()
            .next()
            .map(|binding| DomainBindingVerification {
                host: binding.host,
                user_id: binding.user_id,
                studio_id: value_record_id(&binding.studio_id),
                ownership_status: binding.ownership_status,
                certificate_status: binding.certificate_status,
                verification_token: binding.verification_token,
            }))
    }

    async fn validate_tunnel_connector_identity(
        &self,
        constellation_id: &str,
        habitat_node_id: &str,
        horizon_node_id: &str,
        connector_key: &str,
    ) -> Result<bool> {
        if !self.versioned_schema {
            return Ok(false);
        }
        let constellation_id = prefixed_record_id("constellation", constellation_id);
        let habitat_node_id = prefixed_record_id("infrastructure_node", habitat_node_id);
        let horizon_node_id = prefixed_record_id("infrastructure_node", horizon_node_id);
        let connectors: Vec<TunnelConnectorRecord> = self
            .db
            .query_rows(
                "SELECT * FROM tunnel_connector WHERE connectorKey = $connectorKey AND habitatNodeId = type::record($habitatNodeId) AND horizonNodeId = type::record($horizonNodeId) AND constellationId = type::record($constellationId) AND status IN ['registering', 'online', 'degraded'] LIMIT 1",
                serde_json::json!({
                    "connectorKey": connector_key,
                    "habitatNodeId": habitat_node_id,
                    "horizonNodeId": horizon_node_id,
                    "constellationId": constellation_id,
                }),
            )
            .await?;
        let Some(connector) = connectors.into_iter().next() else {
            return Ok(false);
        };
        if value_record_id(&connector.constellation_id) != constellation_id
            || value_record_id(&connector.habitat_node_id) != habitat_node_id
            || value_record_id(&connector.horizon_node_id) != horizon_node_id
        {
            return Ok(false);
        }

        let Some(habitat) = self
            .db
            .select_by_record_id::<InfrastructureNodeRecord>(&habitat_node_id)
            .await?
        else {
            return Ok(false);
        };
        let Some(horizon) = self
            .db
            .select_by_record_id::<InfrastructureNodeRecord>(&horizon_node_id)
            .await?
        else {
            return Ok(false);
        };
        Ok(habitat.role == "habitat"
            && horizon.role == "horizon"
            && matches!(
                habitat.status.as_str(),
                "online" | "degraded" | "registering"
            )
            && matches!(horizon.status.as_str(), "online" | "degraded")
            && value_record_id(&habitat.constellation_id) == constellation_id
            && value_record_id(&horizon.constellation_id) == constellation_id)
    }

    async fn resolve_route(&self, host: &str) -> Result<Option<EdgeRouteResolution>> {
        if !self.versioned_schema {
            return Ok(self
                .resolve_host(host)
                .await?
                .map(|resolution| EdgeRouteResolution {
                    host: resolution.domain.host,
                    user_id: resolution.proxy.user_id,
                    studio_id: resolution.proxy.studio_id,
                    proxy_name: resolution.proxy.proxy_name,
                    local_ip: resolution.proxy.local_ip,
                    local_port: resolution.proxy.local_port,
                    deployment_id: None,
                    runtime_instance_id: None,
                    connector_key: None,
                    horizon_node_id: None,
                    legacy: true,
                }));
        }
        let normalized = normalize_host(host);
        let domains: Vec<DomainBindingRecord> = self
            .db
            .query_rows(
                "SELECT * FROM domain_binding WHERE host = $host LIMIT 1",
                serde_json::json!({ "host": normalized }),
            )
            .await?;

        let Some(domain) = domains.into_iter().next() else {
            return Ok(self
                .resolve_host(host)
                .await?
                .map(|resolution| EdgeRouteResolution {
                    host: resolution.domain.host,
                    user_id: resolution.proxy.user_id,
                    studio_id: resolution.proxy.studio_id,
                    proxy_name: resolution.proxy.proxy_name,
                    local_ip: resolution.proxy.local_ip,
                    local_port: resolution.proxy.local_port,
                    deployment_id: None,
                    runtime_instance_id: None,
                    connector_key: None,
                    horizon_node_id: None,
                    legacy: true,
                }));
        };

        // A new Domain Binding is authoritative. Invalid new graph state must not
        // fall through to a legacy proxy and bypass the health gate.
        if domain.ownership_status != "verified" || domain.certificate_status != "active" {
            return Ok(None);
        }
        let domain_id = record_id_string(&domain.id);
        let routes: Vec<DeploymentRouteRecord> = self
            .db
            .query_rows(
                "SELECT * FROM deployment_route WHERE domainBindingId = type::record($domainBindingId) AND status = 'active' LIMIT 1",
                serde_json::json!({ "domainBindingId": domain_id }),
            )
            .await?;
        let Some(route) = routes.into_iter().next() else {
            return Ok(None);
        };
        if route.status != "active" || !records_match(&route.domain_binding_id, &domain_id) {
            return Ok(None);
        }

        let deployment_id = value_record_id(&route.deployment_id);
        let Some(deployment) = self
            .db
            .select_by_record_id::<DeploymentRecord>(&deployment_id)
            .await?
        else {
            return Ok(None);
        };
        if deployment.status != "active"
            || !tenant_records_match(
                &domain.user_id,
                &domain.studio_id,
                &deployment.user_id,
                &deployment.studio_id,
            )
        {
            return Ok(None);
        }
        let Some(runtime_value) = deployment.active_runtime_instance_id.as_ref() else {
            return Ok(None);
        };
        let runtime_id = value_record_id(runtime_value);
        let Some(runtime) = self
            .db
            .select_by_record_id::<RuntimeInstanceRecord>(&runtime_id)
            .await?
        else {
            return Ok(None);
        };
        if runtime.status != "healthy" || !records_match(&runtime.deployment_id, &deployment_id) {
            return Ok(None);
        }

        let connector_id = value_record_id(&route.tunnel_connector_id);
        let Some(connector) = self
            .db
            .select_by_record_id::<TunnelConnectorRecord>(&connector_id)
            .await?
        else {
            return Ok(None);
        };
        if connector.status != "online"
            || value_record_id(&connector.habitat_node_id) != value_record_id(&runtime.node_id)
            || value_record_id(&connector.horizon_node_id)
                != value_record_id(&route.horizon_node_id)
        {
            return Ok(None);
        }

        let habitat_id = value_record_id(&runtime.node_id);
        let Some(habitat) = self
            .db
            .select_by_record_id::<InfrastructureNodeRecord>(&habitat_id)
            .await?
        else {
            return Ok(None);
        };
        let horizon_id = value_record_id(&route.horizon_node_id);
        let Some(horizon) = self
            .db
            .select_by_record_id::<InfrastructureNodeRecord>(&horizon_id)
            .await?
        else {
            return Ok(None);
        };
        let constellation_id = value_record_id(&connector.constellation_id);
        if habitat.role != "habitat"
            || !matches!(habitat.status.as_str(), "online" | "degraded")
            || horizon.role != "horizon"
            || !matches!(horizon.status.as_str(), "online" | "degraded")
            || value_record_id(&habitat.constellation_id) != constellation_id
            || value_record_id(&horizon.constellation_id) != constellation_id
        {
            return Ok(None);
        }

        let Some((local_ip, local_port)) = split_service_key(&runtime.service_key) else {
            return Ok(None);
        };
        Ok(Some(EdgeRouteResolution {
            host: domain.host,
            user_id: domain.user_id,
            studio_id: value_record_id(&domain.studio_id),
            proxy_name: runtime.service_key,
            local_ip,
            local_port,
            deployment_id: Some(record_id_string(&deployment.id)),
            runtime_instance_id: Some(record_id_string(&runtime.id)),
            connector_key: Some(connector.connector_key),
            horizon_node_id: Some(record_id_string(&horizon.id)),
            legacy: false,
        }))
    }

    async fn resolve_deployment_candidate(
        &self,
        host: &str,
        deployment_id: &str,
        connector_key: &str,
        horizon_node_id: &str,
    ) -> Result<Option<EdgeRouteResolution>> {
        if !self.versioned_schema {
            return Ok(None);
        }
        let normalized = normalize_host(host);
        let domains: Vec<DomainBindingRecord> = self
            .db
            .query_rows(
                "SELECT * FROM domain_binding WHERE host = $host LIMIT 1",
                serde_json::json!({ "host": normalized }),
            )
            .await?;
        let Some(domain) = domains.into_iter().next() else {
            return Ok(None);
        };
        if domain.ownership_status != "verified" || domain.certificate_status != "active" {
            return Ok(None);
        }

        let deployment_id = prefixed_record_id("deployment", deployment_id);
        let Some(deployment) = self
            .db
            .select_by_record_id::<DeploymentRecord>(&deployment_id)
            .await?
        else {
            return Ok(None);
        };
        if deployment.status != "active"
            || !tenant_records_match(
                &domain.user_id,
                &domain.studio_id,
                &deployment.user_id,
                &deployment.studio_id,
            )
        {
            return Ok(None);
        }
        let Some(runtime_value) = deployment.active_runtime_instance_id.as_ref() else {
            return Ok(None);
        };
        let runtime_id = value_record_id(runtime_value);
        let Some(runtime) = self
            .db
            .select_by_record_id::<RuntimeInstanceRecord>(&runtime_id)
            .await?
        else {
            return Ok(None);
        };
        if runtime.status != "healthy" || !records_match(&runtime.deployment_id, &deployment_id) {
            return Ok(None);
        }

        let habitat_id = value_record_id(&runtime.node_id);
        let connectors: Vec<TunnelConnectorRecord> = self
            .db
            .query_rows(
                "SELECT * FROM tunnel_connector WHERE connectorKey = $connectorKey AND habitatNodeId = type::record($habitatNodeId) AND status = 'online' LIMIT 1",
                serde_json::json!({
                    "connectorKey": connector_key,
                    "habitatNodeId": habitat_id,
                }),
            )
            .await?;
        let Some(connector) = connectors.into_iter().next() else {
            return Ok(None);
        };
        let Some(habitat) = self
            .db
            .select_by_record_id::<InfrastructureNodeRecord>(&habitat_id)
            .await?
        else {
            return Ok(None);
        };
        let horizon_id = prefixed_record_id("infrastructure_node", horizon_node_id);
        if value_record_id(&connector.horizon_node_id) != horizon_id {
            return Ok(None);
        }
        let Some(horizon) = self
            .db
            .select_by_record_id::<InfrastructureNodeRecord>(&horizon_id)
            .await?
        else {
            return Ok(None);
        };
        let constellation_id = value_record_id(&connector.constellation_id);
        if habitat.role != "habitat"
            || !matches!(habitat.status.as_str(), "online" | "degraded")
            || horizon.role != "horizon"
            || !matches!(horizon.status.as_str(), "online" | "degraded")
            || value_record_id(&habitat.constellation_id) != constellation_id
            || value_record_id(&horizon.constellation_id) != constellation_id
        {
            return Ok(None);
        }
        let Some((local_ip, local_port)) = split_service_key(&runtime.service_key) else {
            return Ok(None);
        };
        Ok(Some(EdgeRouteResolution {
            host: domain.host,
            user_id: domain.user_id,
            studio_id: value_record_id(&domain.studio_id),
            proxy_name: runtime.service_key,
            local_ip,
            local_port,
            deployment_id: Some(record_id_string(&deployment.id)),
            runtime_instance_id: Some(record_id_string(&runtime.id)),
            connector_key: Some(connector.connector_key),
            horizon_node_id: Some(record_id_string(&horizon.id)),
            legacy: false,
        }))
    }

    async fn resolve_host(&self, host: &str) -> Result<Option<DomainResolution>> {
        let normalized = normalize_host(host);

        let domains: Vec<ProxyDomain> = self
            .db
            .query_rows(
                &format!(
                    "SELECT * FROM {} WHERE host = $host AND status = 'active' LIMIT 1",
                    self.schema.domain_table
                ),
                serde_json::json!({ "host": normalized }),
            )
            .await?;

        let domain = match domains.into_iter().next() {
            Some(d) => d,
            None => return Ok(None),
        };

        let proxy = self
            .db
            .select_by_record_id::<WorkspaceProxy>(&domain.proxy_id)
            .await?;
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
                &format!(
                    "SELECT * FROM {} WHERE host = $host LIMIT 1",
                    self.schema.domain_table
                ),
                serde_json::json!({ "host": normalized }),
            )
            .await?;

        let domain = match domains.into_iter().next() {
            Some(d) => d,
            None => return Ok(None),
        };

        let proxy = self
            .db
            .select_by_record_id::<WorkspaceProxy>(&domain.proxy_id)
            .await?;
        let Some(proxy) = proxy else {
            return Ok(None);
        };

        Ok(Some(DomainResolution { proxy, domain }))
    }

    async fn list_domains_for_studio(&self, studio_id: &str) -> Result<Vec<DomainResolution>> {
        let proxies: Vec<WorkspaceProxy> = self
            .db
            .query_rows(
                &format!(
                    "SELECT * FROM {} WHERE studioId = $studioId ORDER BY updatedAt DESC",
                    self.schema.proxy_table
                ),
                serde_json::json!({ "studioId": studio_id }),
            )
            .await?;

        let mut results = Vec::new();
        for proxy in &proxies {
            let proxy_id = record_id_string(&proxy.id);
            let domains: Vec<ProxyDomain> = self
                .db
                .query_rows(
                    &format!(
                        "SELECT * FROM {} WHERE proxyId = $proxyId ORDER BY updatedAt DESC",
                        self.schema.domain_table
                    ),
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
                &format!(
                    "SELECT * FROM {} WHERE proxyName = $proxyName AND enabled = true LIMIT 1",
                    self.schema.proxy_table
                ),
                serde_json::json!({ "proxyName": name }),
            )
            .await?;
        Ok(proxies.into_iter().next())
    }

    async fn list_proxy_domains(&self, name: &str) -> Result<Vec<DomainResolution>> {
        let proxies: Vec<WorkspaceProxy> = self
            .db
            .query_rows(
                &format!(
                    "SELECT * FROM {} WHERE proxyName = $proxyName LIMIT 1",
                    self.schema.proxy_table
                ),
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
                &format!(
                    "SELECT * FROM {} WHERE proxyId = $proxyId",
                    self.schema.domain_table
                ),
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
                &format!(
                    "SELECT * FROM {} WHERE proxyName = $proxyName LIMIT 1",
                    self.schema.proxy_table
                ),
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
                    &format!(
                        "SELECT * FROM {} WHERE proxyName = $proxyName LIMIT 1",
                        self.schema.proxy_table
                    ),
                    serde_json::json!({ "proxyName": &input.proxy_name }),
                )
                .await?;
            updated.into_iter().next().unwrap()
        } else {
            let mut content = proxy_content;
            content["createdAt"] = serde_json::json!(now);
            self.db
                .create_record(&self.schema.proxy_table, content)
                .await?
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
                    &format!(
                        "SELECT * FROM {} WHERE host = $host LIMIT 1",
                        self.schema.domain_table
                    ),
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
                        &format!(
                            "SELECT * FROM {} WHERE host = $host LIMIT 1",
                            self.schema.domain_table
                        ),
                        serde_json::json!({ "host": &host }),
                    )
                    .await?;
                fetched.into_iter().next().unwrap()
            } else {
                let mut content = domain_content;
                content["createdAt"] = serde_json::json!(now);
                self.db
                    .create_record(&self.schema.domain_table, content)
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
        let status: DomainStatus = status.parse().map_err(|e: String| anyhow::anyhow!(e))?;
        let now = chrono::Utc::now().timestamp_millis();

        let domains: Vec<ProxyDomain> = self
            .db
            .query_rows(
                &format!(
                    "SELECT * FROM {} WHERE host = $host LIMIT 1",
                    self.schema.domain_table
                ),
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
                &format!(
                    "SELECT * FROM {} WHERE host = $host LIMIT 1",
                    self.schema.domain_table
                ),
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

    #[test]
    fn deployment_route_tenant_match_requires_user_and_studio() {
        let studio_one = serde_json::json!("studio:one");
        let studio_two = serde_json::json!("studio:two");
        assert!(tenant_records_match(
            "user-one",
            &studio_one,
            "user-one",
            &studio_one,
        ));
        assert!(!tenant_records_match(
            "user-one",
            &studio_one,
            "user-two",
            &studio_one,
        ));
        assert!(!tenant_records_match(
            "user-one",
            &studio_one,
            "user-one",
            &studio_two,
        ));
    }

    #[test]
    fn deployment_service_key_requires_host_and_port() {
        assert_eq!(
            split_service_key("release-service.namespace.svc.cluster.local:4173"),
            Some(("release-service.namespace.svc.cluster.local".into(), 4173,)),
        );
        assert_eq!(split_service_key("missing-port"), None);
        assert_eq!(split_service_key("host:0"), None);
    }

    async fn test_db() -> Surreal<surrealdb::engine::remote::http::Client> {
        use surrealdb::opt::auth::Root;

        let url = std::env::var("SURREAL_TEST_URL").unwrap_or_else(|_| "127.0.0.1:8000".into());
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
        SurrealStore::new(db, StoreSchemaConfig::studio())
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

        assert!(
            store
                .resolve_host("disableme.dlx.studio")
                .await
                .unwrap()
                .is_some()
        );
        store.disable_proxy("disable-test").await.unwrap();
        assert!(
            store
                .resolve_host("disableme.dlx.studio")
                .await
                .unwrap()
                .is_none()
        );
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

        assert!(
            store
                .remove_domain("remove-test.example", None)
                .await
                .unwrap()
        );
        assert!(
            !store
                .remove_domain("remove-test.example", None)
                .await
                .unwrap()
        );
    }

    #[tokio::test]
    #[ignore]
    async fn integration_versioned_route_graph_is_tenant_and_connector_safe() {
        let store = setup_store().await;
        let key = chrono::Utc::now().timestamp_millis().to_string();
        let constellation_id = format!("route_constellation_{key}");
        let habitat_id = format!("route_habitat_{key}");
        let horizon_id = format!("route_horizon_{key}");
        let domain_id = format!("route_domain_{key}");
        let deployment_id = format!("route_deployment_{key}");
        let runtime_id = format!("route_runtime_{key}");
        let connector_id = format!("route_connector_{key}");
        let route_id = format!("route_{key}");
        let connector_key = format!("connector-key-{key}");
        let host = format!("route-{key}.example.test");
        let service_key = format!("release-service.route-{key}.svc.cluster.local:4173");

        store
            .db
            .query(
                r#"
                CREATE type::record('constellation', $constellationId) CONTENT {
                  key: $constellationId, name: 'Edge Route Test', status: 'active',
                  metadata: {}, createdAt: time::now(), updatedAt: time::now()
                };
                CREATE type::record('infrastructure_node', $habitatId) CONTENT {
                  constellationId: type::record('constellation', $constellationId),
                  nodeKey: $habitatId, role: 'habitat', displayName: 'Habitat Test',
                  hostname: $habitatId, status: 'online', capabilities: {}, metadata: {},
                  lastHeartbeatAt: time::now(), createdAt: time::now(), updatedAt: time::now()
                };
                CREATE type::record('infrastructure_node', $horizonId) CONTENT {
                  constellationId: type::record('constellation', $constellationId),
                  nodeKey: $horizonId, role: 'horizon', displayName: 'Horizon Test',
                  hostname: $horizonId, status: 'online', capabilities: {}, metadata: {},
                  lastHeartbeatAt: time::now(), createdAt: time::now(), updatedAt: time::now()
                };
                CREATE type::record('domain_binding', $domainId) CONTENT {
                  userId: 'fixture-user', studioId: studio:studio_one, host: $host,
                  kind: 'custom', ownershipStatus: 'verified', certificateStatus: 'active',
                  verificationToken: 'route-test-token', verifiedAt: time::now(),
                  createdAt: time::now(), updatedAt: time::now()
                };
                CREATE type::record('deployment', $deploymentId) CONTENT {
                  userId: 'fixture-user', studioId: studio:studio_one, environment: 'production',
                  releaseId: release:route_fixture, status: 'active', activatedAt: time::now(),
                  createdAt: time::now(), updatedAt: time::now()
                };
                CREATE type::record('runtime_instance', $runtimeId) CONTENT {
                  deploymentId: type::record('deployment', $deploymentId),
                  nodeId: type::record('infrastructure_node', $habitatId), provider: 'integration',
                  providerInstanceId: $runtimeId, status: 'healthy', serviceKey: $serviceKey,
                  healthCheck: { path: '/' }, startedAt: time::now(),
                  createdAt: time::now(), updatedAt: time::now()
                };
                UPDATE type::record('deployment', $deploymentId) SET
                  activeRuntimeInstanceId = type::record('runtime_instance', $runtimeId),
                  updatedAt = time::now();
                CREATE type::record('tunnel_connector', $connectorId) CONTENT {
                  constellationId: type::record('constellation', $constellationId),
                  habitatNodeId: type::record('infrastructure_node', $habitatId),
                  horizonNodeId: type::record('infrastructure_node', $horizonId),
                  connectorKey: $connectorKey, protocol: 'nova-yamux-v1', status: 'online',
                  connectedAt: time::now(), lastSeenAt: time::now(), metadata: {},
                  createdAt: time::now(), updatedAt: time::now()
                };
                CREATE type::record('deployment_route', $routeId) CONTENT {
                  domainBindingId: type::record('domain_binding', $domainId),
                  deploymentId: type::record('deployment', $deploymentId),
                  horizonNodeId: type::record('infrastructure_node', $horizonId),
                  tunnelConnectorId: type::record('tunnel_connector', $connectorId),
                  status: 'active', activatedAt: time::now(),
                  createdAt: time::now(), updatedAt: time::now()
                };
                "#,
            )
            .bind(serde_json::json!({
                "constellationId": constellation_id,
                "habitatId": habitat_id,
                "horizonId": horizon_id,
                "domainId": domain_id,
                "deploymentId": deployment_id,
                "runtimeId": runtime_id,
                "connectorId": connector_id,
                "routeId": route_id,
                "connectorKey": connector_key,
                "host": host,
                "serviceKey": service_key,
            }))
            .await
            .unwrap();

        let binding = store
            .get_domain_binding_verification(&host)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(binding.user_id, "fixture-user");
        assert_eq!(
            binding.verification_token.as_deref(),
            Some("route-test-token")
        );
        assert!(
            store
                .validate_tunnel_connector_identity(
                    &constellation_id,
                    &habitat_id,
                    &horizon_id,
                    &connector_key,
                )
                .await
                .unwrap()
        );
        assert!(
            !store
                .validate_tunnel_connector_identity(
                    &constellation_id,
                    &habitat_id,
                    &horizon_id,
                    "wrong-connector",
                )
                .await
                .unwrap()
        );

        let resolved = store.resolve_route(&host).await.unwrap().unwrap();
        assert_eq!(resolved.user_id, "fixture-user");
        assert_eq!(
            resolved.connector_key.as_deref(),
            Some(connector_key.as_str())
        );
        assert_eq!(resolved.proxy_name, service_key);

        store
            .db
            .query(
                "UPDATE type::record('runtime_instance', $runtimeId) SET status = 'unhealthy', updatedAt = time::now()",
            )
            .bind(serde_json::json!({ "runtimeId": runtime_id }))
            .await
            .unwrap();
        assert!(store.resolve_route(&host).await.unwrap().is_none());
        let route_status: Vec<serde_json::Value> = store
            .db
            .query_rows(
                "SELECT status FROM deployment_route WHERE id = type::record('deployment_route', $routeId)",
                serde_json::json!({ "routeId": route_id }),
            )
            .await
            .unwrap();
        assert_eq!(route_status[0]["status"], "active");

        store
            .db
            .query(
                "UPDATE type::record('runtime_instance', $runtimeId) SET status = 'healthy'; UPDATE type::record('deployment', $deploymentId) SET userId = 'other-user'",
            )
            .bind(serde_json::json!({
                "runtimeId": runtime_id,
                "deploymentId": deployment_id,
            }))
            .await
            .unwrap();
        assert!(store.resolve_route(&host).await.unwrap().is_none());
    }
}
