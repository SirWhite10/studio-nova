//! SurrealDB connection pool
//! TODO: implement connection, namespace/db selection

use anyhow::Result;
use surrealdb::Surreal;
use surrealdb::engine::remote::ws::Ws;

pub struct SurrealClient {
    pub db: Surreal<Ws>,
}

impl SurrealClient {
    pub async fn connect(url: &str, namespace: &str, database: &str) -> Result<Self> {
        let db = Surreal::new::<Ws>(url).await?;
        db.use_ns(namespace).use_db(database).await?;
        Ok(Self { db })
    }
}
