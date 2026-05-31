//! SurrealDB connection pool
//! TODO: implement connection, namespace/db selection

use anyhow::Result;
use surrealdb::Surreal;
use surrealdb::engine::any::Any;

pub struct SurrealClient {
    pub db: Surreal<Any>,
}

impl SurrealClient {
    pub async fn connect(url: &str, namespace: &str, database: &str) -> Result<Self> {
        let db = Surreal::init();
        // Connect using the configured protocol from the URL
        db.connect(url).await?;
        db.use_ns(namespace).use_db(database).await?;
        Ok(Self { db })
    }
}
