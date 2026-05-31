//! SurrealStore implementation of DomainStore
//! TODO: implement all DomainStore methods using surrealdb crate

use async_trait::async_trait;
use anyhow::Result;
use surrealdb::Surreal;
use surrealdb::engine::remote::ws::Ws;

use crate::store::{DomainStore, ProxyUpsertInput};
use crate::types::*;

pub struct SurrealStore {
    db: Surreal<Ws>,
}

impl SurrealStore {
    pub fn new(db: Surreal<Ws>) -> Self {
        Self { db }
    }
}

#[async_trait]
impl DomainStore for SurrealStore {
    async fn ensure_schema(&self) -> Result<()> {
        crate::schema::ensure_schema(&self.db).await
    }

    async fn health(&self) -> Result<StoreHealth> {
        // TODO: query SurrealDB for health
        Ok(StoreHealth { ok: true, message: Some("surrealdb connected".into()) })
    }

    async fn resolve_host(&self, _host: &str) -> Result<Option<DomainResolution>> {
        // TODO: query live cache then SurrealDB
        Ok(None)
    }

    async fn get_domain_by_host(&self, _host: &str) -> Result<Option<DomainResolution>> {
        // TODO: query SurrealDB
        Ok(None)
    }

    async fn list_domains_for_studio(&self, _studio_id: &str) -> Result<Vec<DomainResolution>> {
        // TODO: query SurrealDB
        Ok(vec![])
    }

    async fn get_proxy_by_name(&self, _name: &str) -> Result<Option<WorkspaceProxy>> {
        // TODO: query SurrealDB
        Ok(None)
    }

    async fn list_proxy_domains(&self, _name: &str) -> Result<Vec<DomainResolution>> {
        // TODO: query SurrealDB
        Ok(vec![])
    }

    async fn upsert_proxy(&self, _input: ProxyUpsertInput) -> Result<Vec<DomainResolution>> {
        // TODO: upsert proxy + create domain records
        Ok(vec![])
    }

    async fn set_domain_status(&self, _host: &str, _status: &str) -> Result<Option<DomainResolution>> {
        // TODO: update domain status in SurrealDB
        Ok(None)
    }

    async fn remove_domain(&self, _host: &str, _studio_id: Option<&str>) -> Result<bool> {
        // TODO: delete domain from SurrealDB
        Ok(false)
    }

    async fn disable_proxy(&self, _name: &str) -> Result<()> {
        // TODO: disable proxy in SurrealDB
        Ok(())
    }
}
