//! Domain validation utilities for the edge-api crate.
//!
//! Provides host normalisation, validation, classification, and reserved-name
//! checks. Every function is pure and unit-testable in isolation.

use std::net::IpAddr;
use thiserror::Error;

// ── Error type ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Error)]
pub enum ValidationError {
    #[error("host too long: {length} chars (max 253)")]
    TooLong { length: usize },
    #[error("host is empty")]
    Empty,
    #[error("invalid characters in host: {host}")]
    InvalidChars { host: String },
    #[error("label starts or ends with hyphen: {label}")]
    HyphenLabel { label: String },
    #[error("IP addresses not allowed: {host}")]
    IpAddress { host: String },
    #[error("host is reserved: {host}")]
    Reserved { host: String },
    #[error("{0}")]
    Other(String),
}

// ── Reserved names ─────────────────────────────────────────────────

const RESERVED_LABELS: &[&str] = &[
    "www",
    "api",
    "admin",
    "mail",
    "ftp",
    "localhost",
    "health",
    "status",
    "internal",
];

const RESERVED_SUFFIXES: &[&str] = &[".nova-edge.", ".dlx."];

// ── Public API ─────────────────────────────────────────────────────

/// Normalise a hostname for consistent lookups.
///
/// Trims whitespace, strips trailing dots (DNS root label), and converts
/// to lowercase.
pub fn normalize_host(host: &str) -> String {
    host.trim().trim_end_matches('.').to_lowercase()
}

/// Validate that a hostname is well-formed.
///
/// Checks:
/// - non-empty
/// - max 253 characters
/// - only alphanumeric, hyphen, dot
/// - no label starts/ends with hyphen
/// - not a raw IP address
pub fn validate_host(host: &str) -> Result<(), ValidationError> {
    let normalized = normalize_host(host);

    if normalized.is_empty() {
        return Err(ValidationError::Empty);
    }

    if normalized.len() > 253 {
        return Err(ValidationError::TooLong {
            length: normalized.len(),
        });
    }

    // Reject raw IP addresses (v4 or v6)
    if normalized.parse::<IpAddr>().is_ok() {
        return Err(ValidationError::IpAddress { host: normalized });
    }

    // Check characters and label rules
    for label in normalized.split('.') {
        if label.is_empty() {
            return Err(ValidationError::InvalidChars { host: normalized });
        }

        if !label.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
            return Err(ValidationError::InvalidChars { host: normalized });
        }

        if label.starts_with('-') || label.ends_with('-') {
            return Err(ValidationError::HyphenLabel {
                label: label.to_string(),
            });
        }
    }

    Ok(())
}

/// Check whether a hostname is reserved and cannot be registered.
///
/// Reserved names include common well-known labels (www, api, admin, …)
/// and any host ending with `.nova-edge.*` or `.dlx.*`.
pub fn is_reserved(host: &str) -> bool {
    let normalized = normalize_host(host);

    // Check first label against reserved set
    if let Some(first_label) = normalized.split('.').next() {
        if RESERVED_LABELS.contains(&first_label) {
            return true;
        }
    }

    // More precise: check for *.nova-edge.* and *.dlx.* patterns
    let labels: Vec<&str> = normalized.split('.').collect();
    for window in labels.windows(2) {
        if window[0] == "nova-edge" || window[0] == "dlx" {
            return true;
        }
    }

    false
}

/// Classify a hostname as subdomain or custom based on the subdomain base.
///
/// If the host ends with `.{subdomain_base}`, it's a subdomain; otherwise
/// it's a custom domain. Comparison is case-insensitive.
pub fn classify_host(host: &str, subdomain_base: &str) -> DomainKind {
    let normalized = normalize_host(host);
    let base = normalize_host(subdomain_base);
    let suffix = format!(".{base}");

    if normalized.ends_with(&suffix) || normalized == base {
        DomainKind::Subdomain
    } else {
        DomainKind::Custom
    }
}

/// Generate a subdomain host string: `{subdomain}.{base}`.
pub fn generate_subdomain_host(subdomain: &str, base: &str) -> String {
    format!("{}.{}", normalize_host(subdomain), normalize_host(base))
}

/// Build a DNS TXT verification record name.
///
/// Returns `{prefix}.{host}` — e.g. `_nova-domain.10.cloud`.
pub fn build_verification_record(host: &str, prefix: &str) -> String {
    format!(
        "{}.{}",
        prefix.trim().trim_end_matches('.'),
        normalize_host(host)
    )
}

/// Domain kind — mirrors edge_store::types::DomainKind but without
/// the serde dependency, for use in validation logic.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DomainKind {
    Subdomain,
    Custom,
}

// ── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── normalize_host ───────────────────────────────────────────

    #[test]
    fn normalize_trims_whitespace() {
        assert_eq!(normalize_host("  example.com  "), "example.com");
    }

    #[test]
    fn normalize_strips_trailing_dot() {
        assert_eq!(normalize_host("example.com."), "example.com");
    }

    #[test]
    fn normalize_lowercases() {
        assert_eq!(normalize_host("Example.COM"), "example.com");
    }

    #[test]
    fn normalize_combined() {
        assert_eq!(normalize_host("  EXAMPLE.COM.  "), "example.com");
    }

    // ── validate_host ────────────────────────────────────────────

    #[test]
    fn validate_accepts_good_hosts() {
        assert!(validate_host("example.com").is_ok());
        assert!(validate_host("sub.example.com").is_ok());
        assert!(validate_host("my-workspace.dlx.studio").is_ok());
        assert!(validate_host("a.b.c.d.e.f").is_ok());
    }

    #[test]
    fn validate_rejects_empty() {
        assert!(matches!(validate_host(""), Err(ValidationError::Empty)));
        assert!(matches!(validate_host("   "), Err(ValidationError::Empty)));
        assert!(matches!(validate_host("."), Err(ValidationError::Empty)));
    }

    #[test]
    fn validate_rejects_too_long() {
        let long = "a".repeat(254);
        assert!(matches!(
            validate_host(&long),
            Err(ValidationError::TooLong { .. })
        ));
    }

    #[test]
    fn validate_accepts_max_length() {
        let max = format!("{}.{}", "a".repeat(200), "b".repeat(52));
        assert!(validate_host(&max).is_ok());
    }

    #[test]
    fn validate_rejects_invalid_chars() {
        assert!(matches!(
            validate_host("exam ple.com"),
            Err(ValidationError::InvalidChars { .. })
        ));
        assert!(matches!(
            validate_host("exam!ple.com"),
            Err(ValidationError::InvalidChars { .. })
        ));
        assert!(matches!(
            validate_host("exam_ple.com"),
            Err(ValidationError::InvalidChars { .. })
        ));
    }

    #[test]
    fn validate_rejects_hyphen_labels() {
        assert!(matches!(
            validate_host("-example.com"),
            Err(ValidationError::HyphenLabel { .. })
        ));
        assert!(matches!(
            validate_host("example-.com"),
            Err(ValidationError::HyphenLabel { .. })
        ));
    }

    #[test]
    fn validate_allows_hyphens_in_middle() {
        assert!(validate_host("my-example.com").is_ok());
        assert!(validate_host("my-example.my-domain.com").is_ok());
    }

    #[test]
    fn validate_rejects_ip_address() {
        assert!(matches!(
            validate_host("192.168.1.1"),
            Err(ValidationError::IpAddress { .. })
        ));
        assert!(matches!(
            validate_host("::1"),
            Err(ValidationError::IpAddress { .. })
        ));
    }

    // ── is_reserved ─────────────────────────────────────────────

    #[test]
    fn reserved_catches_well_known_names() {
        assert!(is_reserved("www"));
        assert!(is_reserved("api.example.com"));
        assert!(is_reserved("admin.dlx.studio"));
        assert!(is_reserved("mail"));
        assert!(is_reserved("ftp.test.com"));
        assert!(is_reserved("localhost"));
    }

    #[test]
    fn reserved_allows_normal_hosts() {
        assert!(!is_reserved("myworkspace"));
        assert!(!is_reserved("myworkspace.example.com"));
        assert!(!is_reserved("10.cloud"));
    }

    #[test]
    fn reserved_catches_nova_edge_suffix() {
        assert!(is_reserved("test.nova-edge.io"));
        assert!(is_reserved("anything.nova-edge.com"));
    }

    #[test]
    fn reserved_catches_dlx_suffix() {
        // dlx.* pattern — second label from right is "dlx"
        assert!(is_reserved("anything.dlx.com"));
    }

    #[test]
    fn reserved_case_insensitive() {
        assert!(is_reserved("WWW"));
        assert!(is_reserved("API.example.com"));
    }

    // ── classify_host ───────────────────────────────────────────

    #[test]
    fn classify_subdomain() {
        assert_eq!(
            classify_host("myworkspace.dlx.studio", "dlx.studio"),
            DomainKind::Subdomain
        );
    }

    #[test]
    fn classify_custom() {
        assert_eq!(classify_host("10.cloud", "dlx.studio"), DomainKind::Custom);
    }

    #[test]
    fn classify_exact_match_is_subdomain() {
        assert_eq!(
            classify_host("dlx.studio", "dlx.studio"),
            DomainKind::Subdomain
        );
    }

    #[test]
    fn classify_case_insensitive() {
        assert_eq!(
            classify_host("MyWorkspace.DLX.STUDIO", "dlx.studio"),
            DomainKind::Subdomain
        );
    }

    // ── generate_subdomain_host ─────────────────────────────────

    #[test]
    fn generate_subdomain_formats_correctly() {
        assert_eq!(
            generate_subdomain_host("myworkspace", "dlx.studio"),
            "myworkspace.dlx.studio"
        );
    }

    #[test]
    fn generate_subdomain_normalizes() {
        assert_eq!(
            generate_subdomain_host("  MyWorkspace  ", "DLX.STUDIO."),
            "myworkspace.dlx.studio"
        );
    }

    // ── build_verification_record ───────────────────────────────

    #[test]
    fn verification_record_formats() {
        assert_eq!(
            build_verification_record("10.cloud", "_nova-domain"),
            "_nova-domain.10.cloud"
        );
    }

    #[test]
    fn verification_record_custom_prefix() {
        assert_eq!(
            build_verification_record("example.com", "_verify"),
            "_verify.example.com"
        );
    }

    #[test]
    fn verification_record_strips_trailing_dot_on_prefix() {
        assert_eq!(
            build_verification_record("example.com", "_nova-domain."),
            "_nova-domain.example.com"
        );
    }
}
