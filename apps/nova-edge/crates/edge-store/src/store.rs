use async_trait::async_trait;
use crate::types::*;

#[async_trait]
pub trait DomainStore: Send + Sync {
    async fn ensure_schema(&self) -> anyhow::Result<()>;
    async fn health(&self) -> anyhow::Result<StoreHealth>;
    async fn resolve_host(&self, host: &str) -> anyhow::Result<Option<DomainResolution>>;
    async fn get_domain_by_host(&self, host: &str) -> anyhow::Result<Option<DomainResolution>>;
    async fn list_domains_for_studio(&self, studio_id: &str) -> anyhow::Result<Vec<DomainResolution>>;
    async fn get_proxy_by_name(&self, name: &str) -> anyhow::Result<Option<WorkspaceProxy>>;
    async fn list_proxy_domains(&self, name: &str) -> anyhow::Result<Vec<DomainResolution>>;
    async fn upsert_proxy(&self, input: ProxyUpsertInput) -> anyhow::Result<Vec<DomainResolution>>;
    async fn set_domain_status(&self, host: &str, status: &str) -> anyhow::Result<Option<DomainResolution>>;
    async fn remove_domain(&self, host: &str, studio_id: Option<&str>) -> anyhow::Result<bool>;
    async fn disable_proxy(&self, name: &str) -> anyhow::Result<()>;
}
