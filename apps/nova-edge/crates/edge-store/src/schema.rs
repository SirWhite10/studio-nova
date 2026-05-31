//! SurrealDB schema definitions.
//!
//! The actual DDL is in `surreal_store::SCHEMA_DDL`. This module provides
//! a convenience function for ad-hoc schema initialization.

use anyhow::Result;
use surrealdb::Surreal;
use surrealdb::engine::remote::ws::Client;

/// Run all schema DDL statements against the database.
pub async fn ensure_schema(db: &Surreal<Client>) -> Result<()> {
    for ddl in super::surreal_store::SCHEMA_DDL {
        db.query(*ddl).await?;
    }
    Ok(())
}
