//! SurrealDB schema definitions and migrations
//! TODO: implement ensure_schema with DEFINE TABLE IF NOT EXISTS

use anyhow::Result;
use surrealdb::Surreal;
use surrealdb::engine::remote::ws::Ws;

pub async fn ensure_schema(_db: &Surreal<Ws>) -> Result<()> {
    // TODO: define tables, indexes, and scopes
    // For now, schema is managed externally by SurrealDB seed
    Ok(())
}
