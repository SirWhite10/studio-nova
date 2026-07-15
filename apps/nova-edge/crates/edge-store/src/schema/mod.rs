//! Read-only SurrealDB schema compatibility verification.
//!
//! Schema DDL is owned by the repository-level `database/` project. Edge
//! processes only verify that their required contract is available.

use anyhow::{Result, bail};
use serde_json::Value;
use surrealdb::{Connection, Surreal};

const REQUIRED_TABLES: [&str; 3] = ["workspace_proxy", "proxy_domain", "frp_client"];
const REQUIRED_VERSION: i64 = 1;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SchemaMode {
    Legacy,
    Versioned,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SchemaCompatibility {
    pub mode: SchemaMode,
    pub version: Option<i64>,
    pub release_key: Option<String>,
}

fn table_exists(database_info: &Value, table: &str) -> bool {
    database_info
        .get("tables")
        .and_then(Value::as_object)
        .is_some_and(|tables| tables.contains_key(table))
}

pub fn evaluate_schema(
    database_info: &Value,
    release: Option<&Value>,
    service: &str,
) -> Result<SchemaCompatibility> {
    let missing: Vec<&str> = REQUIRED_TABLES
        .into_iter()
        .filter(|table| !table_exists(database_info, table))
        .collect();
    if !missing.is_empty() {
        bail!(
            "missing SurrealDB tables: {}. Apply the repository database rollout first",
            missing.join(", ")
        );
    }

    if !table_exists(database_info, "schema_release") {
        return Ok(SchemaCompatibility {
            mode: SchemaMode::Legacy,
            version: None,
            release_key: None,
        });
    }

    let Some(release) = release else {
        bail!("schema_release exists but has no release marker");
    };
    let version = release.get("version").and_then(Value::as_i64).unwrap_or(0);
    if version < REQUIRED_VERSION {
        bail!("SurrealDB schema version {version} is below {REQUIRED_VERSION}");
    }

    if let Some(services) = release.get("compatibleServices").and_then(Value::as_array) {
        if !services.is_empty() && !services.iter().any(|item| item.as_str() == Some(service)) {
            bail!("schema release does not declare compatibility with {service}");
        }
    }

    Ok(SchemaCompatibility {
        mode: SchemaMode::Versioned,
        version: Some(version),
        release_key: release
            .get("key")
            .and_then(Value::as_str)
            .map(ToOwned::to_owned),
    })
}

pub async fn verify_schema<C: Connection + Send + Sync>(
    db: &Surreal<C>,
    service: &str,
) -> Result<SchemaCompatibility> {
    let mut info_response = db.query("INFO FOR DB").await?;
    let database_info: Option<Value> = info_response.take(0)?;
    let database_info = database_info.unwrap_or_else(|| Value::Object(Default::default()));

    let release = if table_exists(&database_info, "schema_release") {
        let mut release_response = db
            .query(
                "SELECT key, version, compatibleServices FROM schema_release ORDER BY version DESC LIMIT 1",
            )
            .await?;
        let releases: Vec<Value> = release_response.take(0)?;
        releases.into_iter().next()
    } else {
        None
    };

    evaluate_schema(&database_info, release.as_ref(), service)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn info(versioned: bool) -> Value {
        let mut tables = json!({
            "workspace_proxy": "DEFINE TABLE workspace_proxy",
            "proxy_domain": "DEFINE TABLE proxy_domain",
            "frp_client": "DEFINE TABLE frp_client"
        });
        if versioned {
            tables.as_object_mut().unwrap().insert(
                "schema_release".into(),
                json!("DEFINE TABLE schema_release"),
            );
        }
        json!({ "tables": tables })
    }

    #[test]
    fn accepts_complete_legacy_contract() {
        let report = evaluate_schema(&info(false), None, "nova-edge").unwrap();
        assert_eq!(report.mode, SchemaMode::Legacy);
    }

    #[test]
    fn accepts_declared_versioned_contract() {
        let release = json!({
            "key": "constellation-v1",
            "version": 1,
            "compatibleServices": ["nova-edge"]
        });
        let report = evaluate_schema(&info(true), Some(&release), "nova-edge").unwrap();
        assert_eq!(report.mode, SchemaMode::Versioned);
        assert_eq!(report.version, Some(1));
    }

    #[test]
    fn rejects_missing_tables_and_service_mismatch() {
        assert!(evaluate_schema(&json!({ "tables": {} }), None, "nova-edge").is_err());
        let release = json!({
            "key": "constellation-v1",
            "version": 1,
            "compatibleServices": ["nova-cloud"]
        });
        assert!(evaluate_schema(&info(true), Some(&release), "nova-edge").is_err());
    }
}
