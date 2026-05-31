//! In-memory implementation of DomainStore for testing
//! TODO: implement all DomainStore methods using HashMap/DashMap

use async_trait::async_trait;
use anyhow::Result;
use crate::store::DomainStore;
use crate::types::*;

#[derive(Default)]
pub struct MemoryStore {
    // TODO: add DashMap fields
}

#[async_trait]
impl DomainStore for MemoryStore {
    async fn ensure_schema(&self) -> Result<()> {
        Ok(())
    }

    async fn health(&self) -> Result<StoreHealth> {
        Ok(StoreHealth { ok: true, message: "memory store".into() })
    }

    async fn resolve_host(&self, _host: &str) -> Result<Option<DomainResolution>> {
        Ok(None)
    }

    async fn get_domain_by_host(&self, _host: &str) -> Result<Option<DomainResolution>> {
        Ok(None)
    }

    async fn list_domains_for_studio(&self, _studio_id: &str) -> Result<Vec<DomainResolution>> {
        Ok(vec![])
    }

    async fn get_proxy_by_name(&self, _name: &str) -> Result<Option<WorkspaceProxy>> {
        Ok(None)
    }

    async fn list_proxy_domains(&self, _name: &str) -> Result<Vec<DomainResolution>> {
        Ok(vec![])
    }

    async fn upsert_proxy(&self, _input: crate::store::ProxyUpsertInput) -> Result<Vec<DomainResolution>> {
        Ok(vec![])
    }

    async fn set_domain_status(&self, _host: &str, _status: &str) -> Result<Option<DomainResolution>> {
        Ok(None)
    }

    async fn remove_domain(&self, _host: &str, _studio_id: Option<&str>) -> Result<bool> {
        Ok(false)
    }

    async fn disable_proxy(&self, _name: &str) -> Result<()> {
        Ok(())
    }
}
