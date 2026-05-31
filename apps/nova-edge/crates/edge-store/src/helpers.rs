//! Shared utility functions and constants for the edge-store crate.
//!
//! This module centralises helper functions that were previously duplicated
//! across [`crate::surreal_store`] and other modules.  Every function is
//! pure and unit-testable in isolation.
//!
//! # Contents
//!
//! - **Host normalisation** — [`normalize_host`]
//! - **Token generation** — [`generate_token`]
//! - **SurrealDB record-ID parsing** — [`record_id_string`]
//! - **Proxy prefix helpers** — [`strip_proxy_prefix`], [`proxy_record_id`]
//! - **Table name constants** — [`PROXY_TABLE`], [`DOMAIN_TABLE`], [`FRP_CLIENT_TABLE`]
//! - **Domain record helper** — [`domain_record_id`]

use std::fmt::Write;

// ── Table name constants ─────────────────────────────────────────────

/// SurrealDB table name for workspace proxy records.
pub const PROXY_TABLE: &str = "workspace_proxy";

/// SurrealDB table name for proxy domain records.
pub const DOMAIN_TABLE: &str = "proxy_domain";

/// SurrealDB table name for FRP client records.
pub const FRP_CLIENT_TABLE: &str = "frp_client";

// ── Host helpers ─────────────────────────────────────────────────────

/// Normalise a hostname for consistent lookups.
///
/// Trims whitespace, strips trailing dots (DNS root label), and converts
/// to lowercase.  This mirrors the normalisation used by the TypeScript
/// `nova-domain-control` service.
///
/// # Examples
///
/// ```
/// use edge_store::helpers::normalize_host;
/// assert_eq!(normalize_host("  Example.COM.  "), "example.com");
/// ```
pub fn normalize_host(host: &str) -> String {
    host.trim().trim_end_matches('.').to_lowercase()
}

// ── Token generation ─────────────────────────────────────────────────

/// Generate a cryptographically-random 32-character hexadecimal token.
///
/// Produces 16 random bytes rendered as lower-case hex (32 chars).
/// Used for domain verification tokens and similar one-time secrets.
///
/// # Examples
///
/// ```
/// use edge_store::helpers::generate_token;
/// let token = generate_token();
/// assert_eq!(token.len(), 32);
/// assert!(token.chars().all(|c| c.is_ascii_hexdigit()));
/// ```
pub fn generate_token() -> String {
    let bytes: [u8; 16] = rand::random();
    let mut s = String::with_capacity(32);
    for b in &bytes {
        write!(&mut s, "{b:02x}").unwrap();
    }
    s
}

// ── SurrealDB record-ID parsing ─────────────────────────────────────

/// Extract a `"table:id"` string from a SurrealDB JSON record ID value.
///
/// SurrealDB v3 returns record IDs in several JSON shapes depending on
/// the ID type:
///
/// | SurrealDB ID | JSON shape |
/// |---|---|
/// | `table:abc` | `"table:abc"` (plain string) |
/// | `table:abc` (structured) | `{"tb":"table","id":{"String":"abc"}}` |
/// | `table:123` | `{"tb":"table","id":123}` |
///
/// This function handles all three cases and returns a canonical
/// `"table:id"` string.  Returns an empty `String` for `None` or
/// unrecognised shapes.
///
/// # Examples
///
/// ```
/// use edge_store::helpers::record_id_string;
/// use serde_json::json;
///
/// // Plain string ID
/// let id = Some(json!("workspace_proxy:my-proxy"));
/// assert_eq!(record_id_string(&id), "workspace_proxy:my-proxy");
///
/// // Structured object ID
/// let id = Some(json!({"tb": "proxy_domain", "id": {"String": "test-one0-cloud"}}));
/// assert_eq!(record_id_string(&id), "proxy_domain:test-one0-cloud");
///
/// // None
/// assert_eq!(record_id_string(&None), "");
/// ```
pub fn record_id_string(id: &Option<serde_json::Value>) -> String {
    match id {
        Some(serde_json::Value::String(s)) => s.clone(),
        Some(serde_json::Value::Object(map)) => {
            let tb = map.get("tb").and_then(|v| v.as_str()).unwrap_or("");
            let id_part = map.get("id");
            let id_str = match id_part {
                Some(serde_json::Value::String(s)) => s.clone(),
                Some(serde_json::Value::Object(id_map)) => id_map
                    .get("String")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                Some(serde_json::Value::Number(n)) => n.to_string(),
                _ => String::new(),
            };
            if tb.is_empty() || id_str.is_empty() {
                String::new()
            } else {
                format!("{tb}:{id_str}")
            }
        }
        _ => String::new(),
    }
}

// ── Proxy prefix helpers ─────────────────────────────────────────────

/// Strip the `"workspace_proxy:"` prefix from a record ID string.
///
/// If the prefix is not present the original string is returned unchanged.
///
/// # Examples
///
/// ```
/// use edge_store::helpers::strip_proxy_prefix;
/// assert_eq!(strip_proxy_prefix("workspace_proxy:my-proxy"), "my-proxy");
/// assert_eq!(strip_proxy_prefix("other:thing"), "other:thing");
/// ```
pub fn strip_proxy_prefix(proxy_id: &str) -> &str {
    proxy_id
        .strip_prefix("workspace_proxy:")
        .unwrap_or(proxy_id)
}

/// Format a proxy record ID string: `"workspace_proxy:{name}"`.
///
/// # Examples
///
/// ```
/// use edge_store::helpers::proxy_record_id;
/// assert_eq!(proxy_record_id("my-app"), "workspace_proxy:my-app");
/// ```
pub fn proxy_record_id(name: &str) -> String {
    format!("{PROXY_TABLE}:{name}")
}

/// Format a domain record ID string: `"proxy_domain:{host}"`.
///
/// # Examples
///
/// ```
/// use edge_store::helpers::domain_record_id;
/// assert_eq!(domain_record_id("test.example.com"), "proxy_domain:test.example.com");
/// ```
pub fn domain_record_id(host: &str) -> String {
    format!("{DOMAIN_TABLE}:{host}")
}

// ── Tests ────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    // ── normalize_host ─────────────────────────────────────────────

    #[test]
    fn normalize_trims_and_lowercases() {
        assert_eq!(normalize_host("  Example.COM.  "), "example.com");
        assert_eq!(normalize_host("FOO"), "foo");
        assert_eq!(normalize_host("foo.bar."), "foo.bar");
        assert_eq!(normalize_host("  foo  "), "foo");
    }

    #[test]
    fn normalize_empty_input() {
        assert_eq!(normalize_host(""), "");
        assert_eq!(normalize_host("   "), "");
        assert_eq!(normalize_host("."), "");
        assert_eq!(normalize_host("  .  "), "");
    }

    // ── generate_token ─────────────────────────────────────────────

    #[test]
    fn token_length_and_hex() {
        let token = generate_token();
        assert_eq!(token.len(), 32);
        assert!(token.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn tokens_are_unique() {
        let a = generate_token();
        let b = generate_token();
        assert_ne!(a, b, "two consecutive tokens should differ");
    }

    // ── record_id_string ───────────────────────────────────────────

    #[test]
    fn record_id_plain_string() {
        let id = Some(json!("workspace_proxy:my-proxy"));
        assert_eq!(record_id_string(&id), "workspace_proxy:my-proxy");
    }

    #[test]
    fn record_id_structured_object_string() {
        let id = Some(json!({
            "tb": "proxy_domain",
            "id": {"String": "test-one0-cloud"}
        }));
        assert_eq!(record_id_string(&id), "proxy_domain:test-one0-cloud");
    }

    #[test]
    fn record_id_structured_object_number() {
        let id = Some(json!({
            "tb": "workspace_proxy",
            "id": 42
        }));
        assert_eq!(record_id_string(&id), "workspace_proxy:42");
    }

    #[test]
    fn record_id_structured_object_plain_string_id() {
        let id = Some(json!({
            "tb": "workspace_proxy",
            "id": "abc123"
        }));
        assert_eq!(record_id_string(&id), "workspace_proxy:abc123");
    }

    #[test]
    fn record_id_none() {
        assert_eq!(record_id_string(&None), "");
    }

    #[test]
    fn record_id_empty_table() {
        let id = Some(json!({"tb": "", "id": {"String": "x"}}));
        assert_eq!(record_id_string(&id), "");
    }

    #[test]
    fn record_id_unrecognised() {
        let id = Some(json!(42));
        assert_eq!(record_id_string(&id), "");
    }

    // ── strip_proxy_prefix ─────────────────────────────────────────

    #[test]
    fn strip_proxy_with_prefix() {
        assert_eq!(strip_proxy_prefix("workspace_proxy:my-app"), "my-app");
    }

    #[test]
    fn strip_proxy_without_prefix() {
        assert_eq!(strip_proxy_prefix("other:thing"), "other:thing");
    }

    #[test]
    fn strip_proxy_bare_string() {
        assert_eq!(strip_proxy_prefix("bare"), "bare");
    }

    // ── proxy_record_id / domain_record_id ─────────────────────────

    #[test]
    fn proxy_record_id_format() {
        assert_eq!(proxy_record_id("my-app"), "workspace_proxy:my-app");
    }

    #[test]
    fn domain_record_id_format() {
        assert_eq!(
            domain_record_id("test.example.com"),
            "proxy_domain:test.example.com"
        );
    }

    // ── table constants ────────────────────────────────────────────

    #[test]
    fn table_constants() {
        assert_eq!(PROXY_TABLE, "workspace_proxy");
        assert_eq!(DOMAIN_TABLE, "proxy_domain");
        assert_eq!(FRP_CLIENT_TABLE, "frp_client");
    }
}
