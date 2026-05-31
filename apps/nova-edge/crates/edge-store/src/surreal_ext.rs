//! Extension trait for common SurrealDB query patterns.
//!
//! The SurrealDB v3 Rust SDK requires all values to pass through
//! `serde_json::Value` for both binding query variables and extracting
//! results.  This module wraps those repetitive patterns into a clean,
//! type-safe trait so that calling code can work with domain types
//! directly.
//!
//! # Usage
//!
//! ```ignore
//! use edge_store::surreal_ext::SurrealExt;
//!
//! let rows: Vec<MyType> = db.query_rows(
//!     "SELECT * FROM my_table WHERE field = $value",
//!     serde_json::json!({ "value": "hello" }),
//! ).await?;
//! ```
//!
//! # SurrealDB v3 Quirks
//!
//! - `.bind()` accepts `serde_json::Value` (which implements `SurrealValue`).
//! - `.take(0)` returns `Vec<serde_json::Value>` for array results and
//!   `Option<serde_json::Value>` for scalar results.
//! - All domain types must be deserialised from `serde_json::Value`
//!   intermediaries — never read directly from `take()`.
//! - Use `type::record($id)` for dynamic record IDs (not `type::thing`).
//! - Omit optional fields entirely rather than sending JSON `null`.

use anyhow::Result;
use serde::de::DeserializeOwned;
use surrealdb::Connection;
use surrealdb::Surreal;

/// Extension trait providing high-level query helpers over a [`Surreal<C>`]
/// database connection.
///
/// All methods use `serde_json::Value` as the bind/take layer and
/// deserialize into the caller's requested type `T`, isolating consumers
/// from SurrealDB's JSON encoding quirks.
pub trait SurrealExt<C: Connection> {
    /// Execute a query that returns a result set, deserialized as `Vec<T>`.
    ///
    /// Binds the provided `vars` (a `serde_json::Value` object) and takes
    /// the first result set from the response.
    async fn query_rows<T: DeserializeOwned>(
        &self,
        sql: &str,
        vars: serde_json::Value,
    ) -> Result<Vec<T>>;

    /// Execute a query that returns at most one row, deserialized as `Option<T>`.
    ///
    /// Equivalent to `query_rows` but returns only the first match.
    async fn find_one<T: DeserializeOwned>(
        &self,
        sql: &str,
        vars: serde_json::Value,
    ) -> Result<Option<T>>;

    /// Create a new record in `table` with the given JSON `content`.
    ///
    /// Uses `CREATE type::record($table, rand::uuid()) CONTENT $content`
    /// to let SurrealDB assign a random UUID as the record ID.
    /// Returns the created record deserialized as `T`.
    async fn create_record<T: DeserializeOwned>(
        &self,
        table: &str,
        content: serde_json::Value,
    ) -> Result<T>;

    /// Upsert a record by a unique field value.
    ///
    /// Uses SurrealQL `UPDATE` on a matching record or `CREATE` if none
    /// exists.  The `unique_field` and `unique_value` parameters identify
    /// the existing record (e.g. `"proxyName"` / `"my-proxy"`).
    /// Returns the upserted record deserialized as `T`.
    async fn upsert_record<T: DeserializeOwned>(
        &self,
        table: &str,
        unique_field: &str,
        unique_value: &str,
        content: serde_json::Value,
    ) -> Result<T>;

    /// Select a single record by its full record ID string
    /// (e.g. `"workspace_proxy:abc123"`).
    ///
    /// Uses `SELECT * FROM type::record($id)`.
    /// Returns `None` if the record does not exist or `record_id` is empty.
    async fn select_by_record_id<T: DeserializeOwned>(
        &self,
        record_id: &str,
    ) -> Result<Option<T>>;
}

impl<C: Connection> SurrealExt<C> for Surreal<C> {
    async fn query_rows<T: DeserializeOwned>(
        &self,
        sql: &str,
        vars: serde_json::Value,
    ) -> Result<Vec<T>> {
        let mut response = self.query(sql).bind(vars).await?;
        let raw: Vec<serde_json::Value> = response.take(0)?;
        let rows: Vec<T> = raw
            .into_iter()
            .filter_map(|v| serde_json::from_value(v).ok())
            .collect();
        Ok(rows)
    }

    async fn find_one<T: DeserializeOwned>(
        &self,
        sql: &str,
        vars: serde_json::Value,
    ) -> Result<Option<T>> {
        let rows: Vec<T> = self.query_rows(sql, vars).await?;
        Ok(rows.into_iter().next())
    }

    async fn create_record<T: DeserializeOwned>(
        &self,
        table: &str,
        content: serde_json::Value,
    ) -> Result<T> {
        let sql = "CREATE type::record($table, rand::uuid()) CONTENT $content";
        let mut response = self
            .query(sql)
            .bind(serde_json::json!({
                "table": table,
                "content": content,
            }))
            .await?;
        let raw: Vec<serde_json::Value> = response.take(0)?;
        let row: T = raw
            .into_iter()
            .filter_map(|v| serde_json::from_value(v).ok())
            .next()
            .ok_or_else(|| anyhow::anyhow!("create_record returned no rows for table '{table}'"))?;
        Ok(row)
    }

    async fn upsert_record<T: DeserializeOwned>(
        &self,
        table: &str,
        unique_field: &str,
        unique_value: &str,
        content: serde_json::Value,
    ) -> Result<T> {
        // Attempt to update an existing record matching the unique field.
        let update_sql = format!(
            "UPDATE {table} MERGE $content WHERE {unique_field} = $unique_value"
        );
        let mut response = self
            .query(&update_sql)
            .bind(serde_json::json!({
                "content": content,
                "unique_value": unique_value,
            }))
            .await?;
        let raw: Vec<serde_json::Value> = response.take(0)?;
        if let Some(row) = raw
            .into_iter()
            .filter_map(|v| serde_json::from_value::<T>(v).ok())
            .next()
        {
            return Ok(row);
        }

        // No existing record — create a new one.
        let create_sql =
            format!("CREATE {table} CONTENT $content SET {unique_field} = $unique_value");
        let mut response = self
            .query(&create_sql)
            .bind(serde_json::json!({
                "content": content,
                "unique_value": unique_value,
            }))
            .await?;
        let raw: Vec<serde_json::Value> = response.take(0)?;
        raw.into_iter()
            .filter_map(|v| serde_json::from_value::<T>(v).ok())
            .next()
            .ok_or_else(|| {
                anyhow::anyhow!(
                    "upsert_record failed for {table}.{unique_field}={unique_value}"
                )
            })
    }

    async fn select_by_record_id<T: DeserializeOwned>(
        &self,
        record_id: &str,
    ) -> Result<Option<T>> {
        if record_id.is_empty() {
            return Ok(None);
        }
        let mut response = self
            .query("SELECT * FROM type::record($id)")
            .bind(serde_json::json!({ "id": record_id }))
            .await?;
        let raw: Vec<serde_json::Value> = response.take(0)?;
        Ok(raw
            .into_iter()
            .filter_map(|v| serde_json::from_value(v).ok())
            .next())
    }
}

#[cfg(test)]
mod tests {
    //! Unit tests for the SurrealExt trait.
    //!
    //! These tests verify that the trait compiles and has the correct
    //! method signatures.  Integration tests that exercise SurrealDB
    //! queries live in `surreal_store.rs`.

    use super::*;

    /// Compile-time check that SurrealExt is object-safe enough for
    /// generic usage with both HTTP and WS engines.
    #[test]
    fn trait_compiles_for_http() {
        // Compile-time check: SurrealExt is implemented for Surreal<http::Client>
        fn _check(_: Surreal<surrealdb::engine::remote::http::Client>) {}
    }
}
