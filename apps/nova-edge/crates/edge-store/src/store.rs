use crate::types::*;
use async_trait::async_trait;

#[async_trait]
pub trait DomainStore: Send + Sync {
    async fn health(&self) -> anyhow::Result<StoreHealth>;
    async fn readiness(&self) -> anyhow::Result<serde_json::Value> {
        Ok(serde_json::json!({
            "ok": true,
            "schema": { "mode": "legacy" },
            "nodes": { "ok": true, "skipped": true },
            "tunnel": { "ok": true, "skipped": true },
            "runtime": { "ok": true, "skipped": true },
            "route": { "ok": true, "skipped": true }
        }))
    }
    async fn get_domain_binding_verification(
        &self,
        _host: &str,
    ) -> anyhow::Result<Option<DomainBindingVerification>> {
        Ok(None)
    }
    async fn validate_tunnel_connector_identity(
        &self,
        _constellation_id: &str,
        _habitat_node_id: &str,
        _horizon_node_id: &str,
        _connector_key: &str,
    ) -> anyhow::Result<bool> {
        Ok(false)
    }
    async fn resolve_route(&self, host: &str) -> anyhow::Result<Option<EdgeRouteResolution>> {
        Ok(self
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
            }))
    }
    async fn resolve_deployment_candidate(
        &self,
        _host: &str,
        _deployment_id: &str,
        _connector_key: &str,
        _horizon_node_id: &str,
    ) -> anyhow::Result<Option<EdgeRouteResolution>> {
        Ok(None)
    }
    async fn resolve_host(&self, host: &str) -> anyhow::Result<Option<DomainResolution>>;
    async fn get_domain_by_host(&self, host: &str) -> anyhow::Result<Option<DomainResolution>>;
    async fn list_domains_for_studio(
        &self,
        studio_id: &str,
    ) -> anyhow::Result<Vec<DomainResolution>>;
    async fn get_proxy_by_name(&self, name: &str) -> anyhow::Result<Option<WorkspaceProxy>>;
    async fn list_proxy_domains(&self, name: &str) -> anyhow::Result<Vec<DomainResolution>>;
    async fn upsert_proxy(&self, input: ProxyUpsertInput) -> anyhow::Result<Vec<DomainResolution>>;
    async fn set_domain_status(
        &self,
        host: &str,
        status: &str,
    ) -> anyhow::Result<Option<DomainResolution>>;
    async fn remove_domain(&self, host: &str, studio_id: Option<&str>) -> anyhow::Result<bool>;
    async fn disable_proxy(&self, name: &str) -> anyhow::Result<()>;
}
