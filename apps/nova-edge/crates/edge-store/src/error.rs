//! Error types for the edge-store crate.
//!
//! This module defines [`StoreError`], a unified error enum for all failure modes
//! that can occur when interacting with the SurrealDB-backed domain store.
//!
//! # Conversions
//!
//! - `StoreError` implements `Into<anyhow::Error>` for seamless integration with
//!   the rest of the Nova Edge codebase which uses `anyhow::Result`.
//! - Convenience methods [`StoreError::not_found`], [`StoreError::database`], etc.
//!   allow quick construction without repeating the variant name.

use thiserror::Error;

/// All possible errors produced by the edge-store crate.
#[derive(Debug, Error)]
pub enum StoreError {
    /// A database connection, query, or transaction failed.
    #[error("database error: {0}")]
    Database(String),

    /// A requested domain or proxy record was not found.
    #[error("not found: {0}")]
    NotFound(String),

    /// A status string could not be parsed into a valid [`DomainStatus`](crate::types::DomainStatus).
    #[error("invalid status: {0}")]
    InvalidStatus(String),

    /// A hostname failed validation (empty, malformed, etc.).
    #[error("invalid host: {0}")]
    InvalidHost(String),

    /// A schema definition or migration encountered an error.
    #[error("schema error: {0}")]
    Schema(String),

    /// A configuration value is missing or invalid.
    #[error("config error: {0}")]
    Config(String),
}

impl StoreError {
    /// Shorthand for constructing a [`StoreError::Database`] variant.
    pub fn database(msg: impl Into<String>) -> Self {
        Self::Database(msg.into())
    }

    /// Shorthand for constructing a [`StoreError::NotFound`] variant.
    pub fn not_found(msg: impl Into<String>) -> Self {
        Self::NotFound(msg.into())
    }

    /// Shorthand for constructing a [`StoreError::InvalidStatus`] variant.
    pub fn invalid_status(msg: impl Into<String>) -> Self {
        Self::InvalidStatus(msg.into())
    }

    /// Shorthand for constructing a [`StoreError::InvalidHost`] variant.
    pub fn invalid_host(msg: impl Into<String>) -> Self {
        Self::InvalidHost(msg.into())
    }

    /// Shorthand for constructing a [`StoreError::Schema`] variant.
    pub fn schema(msg: impl Into<String>) -> Self {
        Self::Schema(msg.into())
    }

    /// Shorthand for constructing a [`StoreError::Config`] variant.
    pub fn config(msg: impl Into<String>) -> Self {
        Self::Config(msg.into())
    }

    /// Returns `true` if this error is [`StoreError::NotFound`].
    pub fn is_not_found(&self) -> bool {
        matches!(self, Self::NotFound(_))
    }
}

// ── Conversions ──────────────────────────────────────────────────────

impl From<StoreError> for anyhow::Error {
    fn from(err: StoreError) -> Self {
        anyhow::Error::msg(err.to_string())
    }
}

// Allow `?` propagation from StoreError in anyhow::Result contexts.
// This is the idiomatic way to let StoreError coexist with anyhow.

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_messages() {
        assert_eq!(
            StoreError::Database("connection refused".into()).to_string(),
            "database error: connection refused"
        );
        assert_eq!(
            StoreError::NotFound("proxy my-app".into()).to_string(),
            "not found: proxy my-app"
        );
        assert_eq!(
            StoreError::InvalidStatus("bad".into()).to_string(),
            "invalid status: bad"
        );
        assert_eq!(
            StoreError::InvalidHost("".into()).to_string(),
            "invalid host: "
        );
        assert_eq!(
            StoreError::Schema("migration failed".into()).to_string(),
            "schema error: migration failed"
        );
        assert_eq!(
            StoreError::Config("missing url".into()).to_string(),
            "config error: missing url"
        );
    }

    #[test]
    fn convenience_constructors() {
        let e = StoreError::database("conn refused");
        assert!(matches!(e, StoreError::Database(s) if s == "conn refused"));

        let e = StoreError::not_found("x");
        assert!(e.is_not_found());

        let e = StoreError::invalid_status("unknown");
        assert!(matches!(e, StoreError::InvalidStatus(_)));

        let e = StoreError::invalid_host("");
        assert!(matches!(e, StoreError::InvalidHost(_)));

        let e = StoreError::schema("ddl");
        assert!(matches!(e, StoreError::Schema(_)));

        let e = StoreError::config("url");
        assert!(matches!(e, StoreError::Config(_)));
    }

    #[test]
    fn converts_to_anyhow() {
        let store_err = StoreError::not_found("proxy abc");
        let anyhow_err: anyhow::Error = store_err.into();
        assert!(anyhow_err.to_string().contains("not found"));
    }

    #[test]
    fn not_found_check() {
        assert!(StoreError::not_found("x").is_not_found());
        assert!(!StoreError::database("x").is_not_found());
    }
}
