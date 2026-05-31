//! Configurable store configuration.
//!
//! This module replaces hardcoded table names with a pluggable configuration
//! system. The "studio" domain preset provides defaults matching Studio Nova's
//! schema, and users can override table names, field mappings, and database
//! backend selection via environment variables.
//!
//! # Environment Variables
//!
//! All env vars are prefixed with `NOVA_EDGE_DB_`:
//!
//! | Variable | Default | Description |
//! |---|---|---|
//! | `NOVA_EDGE_DB_BACKEND` | `surrealdb` | Database backend (`surrealdb`) |
//! | `NOVA_EDGE_DB_PROXY_TABLE` | `workspace_proxy` | Proxy table name |
//! | `NOVA_EDGE_DB_DOMAIN_TABLE` | `proxy_domain` | Domain table name |
//! | `NOVA_EDGE_DB_FRP_CLIENT_TABLE` | `frp_client` | FRP client table name |
//! | `NOVA_EDGE_DB_PROXY_ID_FIELD` | `proxyName` | Proxy name field |
//! | `NOVA_EDGE_DB_DOMAIN_HOST_FIELD` | `host` | Domain host field |
//! | `NOVA_EDGE_DB_STUDIO_ID_FIELD` | `studioId` | Studio ID field |
//! | `NOVA_EDGE_DB_USER_ID_FIELD` | `userId` | User ID field |
//! | `NOVA_EDGE_DB_SUBDOMAIN_BASE` | `dlx.studio` | Subdomain base domain |
//!
//! SurrealDB connection settings reuse the `NOVA_EDGE_SURREAL_*` variables
//! from `edge-config`, with sensible defaults so the system works out of
//! the box with the studio preset.

use crate::error::StoreError;

// ── Database Backend ──────────────────────────────────────────────────

/// Database backend selection.
///
/// Currently only SurrealDB is supported. Future variants may include
/// Postgres, SQLite, etc.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DatabaseBackend {
    SurrealDB,
    // Future: Postgres, Sqlite, etc.
}

impl std::fmt::Display for DatabaseBackend {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::SurrealDB => write!(f, "surrealdb"),
        }
    }
}

impl std::str::FromStr for DatabaseBackend {
    type Err = StoreError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "surrealdb" | "surreal" => Ok(Self::SurrealDB),
            other => Err(StoreError::config(format!(
                "Unknown database backend: '{other}'. Supported: surrealdb"
            ))),
        }
    }
}

// ── Schema Configuration ─────────────────────────────────────────────

/// Configuration for which tables/fields to use for domain storage.
///
/// The "studio" domain preset provides defaults matching Studio Nova's
/// schema. Users can override table names and field mappings via env vars.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoreSchemaConfig {
    /// Table name for workspace proxy records. Default: `"workspace_proxy"`.
    pub proxy_table: String,
    /// Table name for proxy domain records. Default: `"proxy_domain"`.
    pub domain_table: String,
    /// Table name for FRP client records. Default: `"frp_client"`.
    pub frp_client_table: String,
    /// Field name for the proxy identifier (unique name). Default: `"proxyName"`.
    pub proxy_id_field: String,
    /// Field name for the domain hostname. Default: `"host"`.
    pub domain_host_field: String,
    /// Field name for the studio ID. Default: `"studioId"`.
    pub studio_id_field: String,
    /// Field name for the user ID. Default: `"userId"`.
    pub user_id_field: String,
    /// Base domain for auto-generated subdomains. Default: `"dlx.studio"`.
    pub subdomain_base: String,
}

impl Default for StoreSchemaConfig {
    fn default() -> Self {
        Self::studio()
    }
}

impl StoreSchemaConfig {
    /// Create a schema config with the studio domain preset defaults.
    pub fn studio() -> Self {
        Self {
            proxy_table: "workspace_proxy".into(),
            domain_table: "proxy_domain".into(),
            frp_client_table: "frp_client".into(),
            proxy_id_field: "proxyName".into(),
            domain_host_field: "host".into(),
            studio_id_field: "studioId".into(),
            user_id_field: "userId".into(),
            subdomain_base: "dlx.studio".into(),
        }
    }

    /// Load schema overrides from environment variables, falling back to
    /// studio defaults for any that are not set.
    pub fn from_env() -> Self {
        Self {
            proxy_table: env_or("NOVA_EDGE_DB_PROXY_TABLE", "workspace_proxy"),
            domain_table: env_or("NOVA_EDGE_DB_DOMAIN_TABLE", "proxy_domain"),
            frp_client_table: env_or("NOVA_EDGE_DB_FRP_CLIENT_TABLE", "frp_client"),
            proxy_id_field: env_or("NOVA_EDGE_DB_PROXY_ID_FIELD", "proxyName"),
            domain_host_field: env_or("NOVA_EDGE_DB_DOMAIN_HOST_FIELD", "host"),
            studio_id_field: env_or("NOVA_EDGE_DB_STUDIO_ID_FIELD", "studioId"),
            user_id_field: env_or("NOVA_EDGE_DB_USER_ID_FIELD", "userId"),
            subdomain_base: env_or("NOVA_EDGE_DB_SUBDOMAIN_BASE", "dlx.studio"),
        }
    }

    /// Build a subdomain host string: `{prefix}.{subdomain_base}`.
    pub fn subdomain_host(&self, prefix: &str) -> String {
        format!("{}.{}", prefix, self.subdomain_base)
    }
}

// ── Store Configuration ──────────────────────────────────────────────

/// Full store configuration combining backend selection, schema mapping,
/// and SurrealDB connection parameters.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoreConfig {
    /// Selected database backend.
    pub backend: DatabaseBackend,
    /// Table/field schema configuration.
    pub schema: StoreSchemaConfig,
    /// SurrealDB connection URL (e.g. `http://127.0.0.1:8000`).
    pub surreal_url: String,
    /// SurrealDB namespace.
    pub surreal_namespace: String,
    /// SurrealDB database name.
    pub surreal_database: String,
    /// SurrealDB auth username.
    pub surreal_username: String,
    /// SurrealDB auth password.
    pub surreal_password: String,
}

impl StoreConfig {
    /// Load all configuration from environment variables, using studio
    /// domain preset defaults where env vars are not set.
    ///
    /// SurrealDB connection settings fall back to the same defaults as
    /// `edge-config::Config` for consistency.
    pub fn from_env() -> Result<Self, StoreError> {
        let backend_str = env_or("NOVA_EDGE_DB_BACKEND", "surrealdb");
        let backend: DatabaseBackend = backend_str
            .parse()
            .map_err(|e: StoreError| StoreError::config(e.to_string()))?;

        Ok(Self {
            backend,
            schema: StoreSchemaConfig::from_env(),
            surreal_url: env_or_required("NOVA_EDGE_SURREAL_URL")?,
            surreal_namespace: env_or("NOVA_EDGE_SURREAL_NAMESPACE", "main"),
            surreal_database: env_or("NOVA_EDGE_SURREAL_DATABASE", "main"),
            surreal_username: env_or("NOVA_EDGE_SURREAL_USERNAME", "root"),
            surreal_password: env_or("NOVA_EDGE_SURREAL_PASSWORD", "root"),
        })
    }

    /// Create a configuration with studio defaults and a specified SurrealDB URL.
    ///
    /// Useful for tests and simple usage where only the DB URL varies.
    pub fn studio_defaults() -> Self {
        Self {
            backend: DatabaseBackend::SurrealDB,
            schema: StoreSchemaConfig::studio(),
            surreal_url: "http://127.0.0.1:8000".into(),
            surreal_namespace: "main".into(),
            surreal_database: "main".into(),
            surreal_username: "root".into(),
            surreal_password: "root".into(),
        }
    }

    /// Create a configuration with studio defaults but a custom schema config.
    ///
    /// All SurrealDB connection parameters use their defaults.
    pub fn with_schema(schema: StoreSchemaConfig) -> Self {
        Self {
            backend: DatabaseBackend::SurrealDB,
            schema,
            surreal_url: "http://127.0.0.1:8000".into(),
            surreal_namespace: "main".into(),
            surreal_database: "main".into(),
            surreal_username: "root".into(),
            surreal_password: "root".into(),
        }
    }

    /// Build a `StoreConfig` from an `edge_config::Config` instance,
    /// using the studio schema preset as defaults.
    pub fn from_edge_config(config: &edge_config::Config) -> Self {
        Self {
            backend: DatabaseBackend::SurrealDB,
            schema: StoreSchemaConfig::studio(),
            surreal_url: config.surreal_url.clone(),
            surreal_namespace: config.surreal_namespace.clone(),
            surreal_database: config.surreal_database.clone(),
            surreal_username: config.surreal_username.clone(),
            surreal_password: config.surreal_password.clone(),
        }
    }
}

// ── Env helpers ───────────────────────────────────────────────────────

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}

fn env_or_required(key: &str) -> Result<String, StoreError> {
    std::env::var(key).map_err(|_| {
        StoreError::config(format!(
            "Required env var {key} not set (needed for store configuration)"
        ))
    })
}

// ── Tests ─────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── DatabaseBackend ────────────────────────────────────────────────

    #[test]
    fn backend_display() {
        assert_eq!(DatabaseBackend::SurrealDB.to_string(), "surrealdb");
    }

    #[test]
    fn backend_from_str() {
        assert_eq!("surrealdb".parse::<DatabaseBackend>().unwrap(), DatabaseBackend::SurrealDB);
        assert_eq!("SurrealDB".parse::<DatabaseBackend>().unwrap(), DatabaseBackend::SurrealDB);
        assert_eq!("surreal".parse::<DatabaseBackend>().unwrap(), DatabaseBackend::SurrealDB);
        assert!("postgres".parse::<DatabaseBackend>().is_err());
    }

    // ── StoreSchemaConfig ─────────────────────────────────────────────

    #[test]
    fn studio_defaults() {
        let schema = StoreSchemaConfig::studio();
        assert_eq!(schema.proxy_table, "workspace_proxy");
        assert_eq!(schema.domain_table, "proxy_domain");
        assert_eq!(schema.frp_client_table, "frp_client");
        assert_eq!(schema.proxy_id_field, "proxyName");
        assert_eq!(schema.domain_host_field, "host");
        assert_eq!(schema.studio_id_field, "studioId");
        assert_eq!(schema.user_id_field, "userId");
        assert_eq!(schema.subdomain_base, "dlx.studio");
    }

    #[test]
    fn default_is_studio() {
        assert_eq!(StoreSchemaConfig::default(), StoreSchemaConfig::studio());
    }

    #[test]
    fn subdomain_host_format() {
        let schema = StoreSchemaConfig::studio();
        assert_eq!(schema.subdomain_host("myapp"), "myapp.dlx.studio");
        assert_eq!(schema.subdomain_host("test"), "test.dlx.studio");
    }

    #[test]
    fn custom_subdomain_base() {
        let schema = StoreSchemaConfig {
            subdomain_base: "custom.example".into(),
            ..StoreSchemaConfig::studio()
        };
        assert_eq!(schema.subdomain_host("app"), "app.custom.example");
    }

    // ── StoreConfig ───────────────────────────────────────────────────

    #[test]
    fn studio_defaults_config() {
        let config = StoreConfig::studio_defaults();
        assert_eq!(config.backend, DatabaseBackend::SurrealDB);
        assert_eq!(config.schema.proxy_table, "workspace_proxy");
        assert_eq!(config.surreal_url, "http://127.0.0.1:8000");
        assert_eq!(config.surreal_namespace, "main");
        assert_eq!(config.surreal_database, "main");
        assert_eq!(config.surreal_username, "root");
        assert_eq!(config.surreal_password, "root");
    }

    #[test]
    fn with_custom_schema() {
        let schema = StoreSchemaConfig {
            proxy_table: "custom_proxy".into(),
            subdomain_base: "my.app".into(),
            ..StoreSchemaConfig::studio()
        };
        let config = StoreConfig::with_schema(schema.clone());
        assert_eq!(config.schema.proxy_table, "custom_proxy");
        assert_eq!(config.schema.subdomain_base, "my.app");
        assert_eq!(config.backend, DatabaseBackend::SurrealDB);
    }

    #[test]
    fn from_env_fails_without_url() {
        unsafe { std::env::remove_var("NOVA_EDGE_SURREAL_URL") };
        let result = StoreConfig::from_env();
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, StoreError::Config(_)));
        assert!(err.to_string().contains("NOVA_EDGE_SURREAL_URL"));
    }

    #[test]
    fn from_env_with_url() {
        unsafe { std::env::set_var("NOVA_EDGE_SURREAL_URL", "http://localhost:9000") };
        unsafe { std::env::remove_var("NOVA_EDGE_DB_BACKEND") };
        let config = StoreConfig::from_env().unwrap();
        assert_eq!(config.surreal_url, "http://localhost:9000");
        assert_eq!(config.backend, DatabaseBackend::SurrealDB);
        // Clean up
        unsafe { std::env::remove_var("NOVA_EDGE_SURREAL_URL") };
    }
}
