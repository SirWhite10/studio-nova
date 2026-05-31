//! DNS TXT record verification for domain ownership.
//!
//! Provides utilities for generating verification tokens, building DNS TXT record
//! names, and verifying that the expected token is present in a domain's TXT records.

use async_trait::async_trait;
use hickory_resolver::TokioAsyncResolver;
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;

/// Prefix used for verification tokens.
const TOKEN_PREFIX: &str = "nova-domain=";

/// Default DNS TXT record prefix.
const DEFAULT_TXT_PREFIX: &str = "_nova-domain";

/// Result of a DNS TXT verification attempt.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VerificationResult {
    pub host: String,
    pub record_name: String,
    pub expected_value: String,
    pub found_values: Vec<String>,
    pub verified: bool,
}

/// Trait abstracting DNS TXT lookups for testability.
#[async_trait]
pub trait DnsResolver: Send + Sync {
    async fn lookup_txt(&self, name: &str) -> anyhow::Result<Vec<String>>;
}

// ---------------------------------------------------------------------------
// Real DNS resolver backed by hickory-resolver
// ---------------------------------------------------------------------------

/// Production DNS resolver using the system resolver configuration.
pub struct HickoryDnsResolver {
    resolver: TokioAsyncResolver,
}

impl HickoryDnsResolver {
    /// Create a new resolver using the system's DNS configuration.
    pub fn new() -> anyhow::Result<Self> {
        let resolver = TokioAsyncResolver::tokio_from_system_conf()?;
        Ok(Self { resolver })
    }

    /// Create a new resolver with a custom upstream DNS server.
    pub fn with_nameserver(addr: SocketAddr) -> Self {
        use hickory_resolver::config::*;
        let mut config = ResolverConfig::new();
        config.add_name_server(NameServerConfig {
            socket_addr: addr,
            protocol: Protocol::Udp,
            tls_dns_name: None,
            trust_negative_responses: false,
            bind_addr: None,
            tls_config: None,
        });
        let opts = ResolverOpts::default();
        let resolver = TokioAsyncResolver::tokio(config, opts);
        Self { resolver }
    }
}

#[async_trait]
impl DnsResolver for HickoryDnsResolver {
    async fn lookup_txt(&self, name: &str) -> anyhow::Result<Vec<String>> {
        let lookup = self.resolver.txt_lookup(name)?;
        let records: Vec<String> = lookup
            .iter()
            .flat_map(|txt| {
                txt.txt_data()
                    .iter()
                    .map(|bytes| String::from_utf8_lossy(bytes).to_string())
            })
            .collect();
        Ok(records)
    }
}

// ---------------------------------------------------------------------------
// Mock DNS resolver for testing
// ---------------------------------------------------------------------------

/// Mock DNS resolver that returns pre-configured records.
#[cfg(test)]
pub struct MockDnsResolver {
    records: Vec<String>,
}

#[cfg(test)]
impl MockDnsResolver {
    pub fn new(records: Vec<String>) -> Self {
        Self { records }
    }
}

#[cfg(test)]
#[async_trait]
impl DnsResolver for MockDnsResolver {
    async fn lookup_txt(&self, _name: &str) -> anyhow::Result<Vec<String>> {
        Ok(self.records.clone())
    }
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/// Generate a random verification token prefixed with `nova-domain=`.
///
/// The token consists of 32 random hex characters after the prefix.
/// Example: `nova-domain=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6`
pub fn generate_verification_token() -> String {
    let mut rng = rand::rng();
    let bytes: [u8; 16] = rng.random();
    let hex: String = bytes.iter().map(|b| format!("{b:02x}")).collect();
    format!("{TOKEN_PREFIX}{hex}")
}

/// Build the DNS TXT record name for verification.
///
/// Returns `{prefix}.{host}`.
/// The `prefix` parameter is the label to prepend (e.g., `_nova-domain`).
pub fn build_txt_record_name(host: &str, prefix: &str) -> String {
    format!("{prefix}.{host}")
}

/// Build the default DNS TXT record name using the standard prefix.
///
/// Equivalent to `build_txt_record_name(host, "_nova-domain")`.
pub fn default_txt_record_name(host: &str) -> String {
    build_txt_record_name(host, DEFAULT_TXT_PREFIX)
}

/// Look up TXT records for the given DNS name using the system resolver.
///
/// This is a convenience function that creates a [`HickoryDnsResolver`] and
/// performs a single lookup.
pub async fn lookup_txt_records(name: &str) -> anyhow::Result<Vec<String>> {
    let resolver = HickoryDnsResolver::new()?;
    resolver.lookup_txt(name).await
}

/// Verify that a DNS TXT record containing the expected token exists for the
/// given host.
///
/// Uses a provided [`DnsResolver`] implementation to perform the lookup.
pub async fn verify_with_resolver(
    resolver: &dyn DnsResolver,
    host: &str,
    expected_token: &str,
    prefix: &str,
) -> anyhow::Result<VerificationResult> {
    let record_name = build_txt_record_name(host, prefix);
    let found_values = resolver.lookup_txt(&record_name).await?;
    let verified = found_values
        .iter()
        .any(|v| v == expected_token || v.contains(expected_token));

    Ok(VerificationResult {
        host: host.to_string(),
        record_name,
        expected_value: expected_token.to_string(),
        found_values,
        verified,
    })
}

/// Verify that a DNS TXT record containing the expected token exists for the
/// given host using the system resolver.
///
/// Uses the default prefix `_nova-domain`.
pub async fn verify_txt_record(
    host: &str,
    expected_token: &str,
    prefix: &str,
) -> anyhow::Result<VerificationResult> {
    let resolver = HickoryDnsResolver::new()?;
    verify_with_resolver(&resolver, host, expected_token, prefix).await
}

// ===========================================================================
// Tests
// ===========================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // -----------------------------------------------------------------------
    // generate_verification_token
    // -----------------------------------------------------------------------

    #[test]
    fn token_has_correct_prefix() {
        let token = generate_verification_token();
        assert!(
            token.starts_with(TOKEN_PREFIX),
            "token should start with '{TOKEN_PREFIX}', got: {token}"
        );
    }

    #[test]
    fn token_has_correct_length() {
        let token = generate_verification_token();
        // "nova-domain=" (12 chars) + 32 hex chars = 44 total
        assert_eq!(
            token.len(),
            TOKEN_PREFIX.len() + 32,
            "token should be {} chars, got {} chars: {token}",
            TOKEN_PREFIX.len() + 32,
            token.len()
        );
    }

    #[test]
    fn token_hex_portion_is_valid_hex() {
        let token = generate_verification_token();
        let hex_part = &token[TOKEN_PREFIX.len()..];
        assert!(
            hex_part.chars().all(|c| c.is_ascii_hexdigit()),
            "hex portion should be valid hex: {hex_part}"
        );
    }

    #[test]
    fn tokens_are_unique() {
        let t1 = generate_verification_token();
        let t2 = generate_verification_token();
        assert_ne!(t1, t2, "consecutive tokens should differ");
    }

    // -----------------------------------------------------------------------
    // build_txt_record_name
    // -----------------------------------------------------------------------

    #[test]
    fn builds_txt_record_name_with_custom_prefix() {
        let name = build_txt_record_name("10.cloud", "_nova-domain");
        assert_eq!(name, "_nova-domain.10.cloud");
    }

    #[test]
    fn builds_txt_record_name_with_different_prefix() {
        let name = build_txt_record_name("example.com", "_verify");
        assert_eq!(name, "_verify.example.com");
    }

    #[test]
    fn default_txt_record_name_uses_standard_prefix() {
        let name = default_txt_record_name("10.cloud");
        assert_eq!(name, "_nova-domain.10.cloud");
    }

    // -----------------------------------------------------------------------
    // VerificationResult serialization (camelCase)
    // -----------------------------------------------------------------------

    #[test]
    fn verification_result_serializes_to_camel_case() {
        let result = VerificationResult {
            host: "example.com".to_string(),
            record_name: "_nova-domain.example.com".to_string(),
            expected_value: "nova-domain=abcd1234".to_string(),
            found_values: vec!["nova-domain=abcd1234".to_string()],
            verified: true,
        };
        let json = serde_json::to_string(&result).expect("serialization should succeed");

        assert!(
            json.contains("\"host\":"),
            "should contain camelCase 'host': {json}"
        );
        assert!(
            json.contains("\"recordName\":"),
            "should contain camelCase 'recordName': {json}"
        );
        assert!(
            json.contains("\"expectedValue\":"),
            "should contain camelCase 'expectedValue': {json}"
        );
        assert!(
            json.contains("\"foundValues\":"),
            "should contain camelCase 'foundValues': {json}"
        );
        assert!(
            json.contains("\"verified\":"),
            "should contain camelCase 'verified': {json}"
        );

        // Ensure snake_case is NOT present
        assert!(
            !json.contains("record_name"),
            "should NOT contain snake_case 'record_name': {json}"
        );
        assert!(
            !json.contains("expected_value"),
            "should NOT contain snake_case 'expected_value': {json}"
        );
        assert!(
            !json.contains("found_values"),
            "should NOT contain snake_case 'found_values': {json}"
        );
    }

    #[test]
    fn verification_result_deserializes_from_camel_case() {
        let json = r#"{
            "host": "example.com",
            "recordName": "_nova-domain.example.com",
            "expectedValue": "nova-domain=abcd1234",
            "foundValues": ["nova-domain=abcd1234"],
            "verified": true
        }"#;
        let result: VerificationResult =
            serde_json::from_str(json).expect("deserialization should succeed");

        assert_eq!(result.host, "example.com");
        assert_eq!(result.record_name, "_nova-domain.example.com");
        assert_eq!(result.expected_value, "nova-domain=abcd1234");
        assert_eq!(result.found_values, vec!["nova-domain=abcd1234"]);
        assert!(result.verified);
    }

    // -----------------------------------------------------------------------
    // verify_with_resolver — mock DNS tests
    // -----------------------------------------------------------------------

    #[tokio::test]
    async fn verify_succeeds_when_matching_token_present() {
        let mock = MockDnsResolver::new(vec!["some-other-txt=value".to_string(),
            "nova-domain=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6".to_string()
        ]);

        let result = verify_with_resolver(
            &mock,
            "example.com",
            "nova-domain=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
            "_nova-domain",
        )
        .await
        .expect("verification should not error");

        assert!(result.verified, "should be verified when token matches");
        assert_eq!(result.host, "example.com");
        assert_eq!(result.record_name, "_nova-domain.example.com");
        assert_eq!(result.expected_value, "nova-domain=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6");
        assert_eq!(result.found_values.len(), 2);
    }

    #[tokio::test]
    async fn verify_fails_when_no_matching_token() {
        let mock = MockDnsResolver::new(vec![
            "some-other-txt=value".to_string(),
            "nova-domain=wrongtoken00000000000000000000000".to_string(),
        ]);

        let result = verify_with_resolver(
            &mock,
            "example.com",
            "nova-domain=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
            "_nova-domain",
        )
        .await
        .expect("verification should not error");

        assert!(
            !result.verified,
            "should NOT be verified when token does not match"
        );
    }

    #[tokio::test]
    async fn verify_fails_when_empty_records() {
        let mock = MockDnsResolver::new(vec![]);

        let result = verify_with_resolver(
            &mock,
            "example.com",
            "nova-domain=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
            "_nova-domain",
        )
        .await
        .expect("verification should not error");

        assert!(
            !result.verified,
            "should NOT be verified when no records returned"
        );
        assert!(result.found_values.is_empty());
    }

    #[tokio::test]
    async fn verify_result_fields_are_populated_correctly() {
        let token = "nova-domain=deadbeefdeadbeefdeadbeefdeadbeef";
        let mock = MockDnsResolver::new(vec![token.to_string()]);

        let result = verify_with_resolver(&mock, "10.cloud", token, "_nova-domain")
            .await
            .expect("verification should not error");

        assert_eq!(result.host, "10.cloud");
        assert_eq!(result.record_name, "_nova-domain.10.cloud");
        assert_eq!(result.expected_value, token);
        assert_eq!(result.found_values, vec![token]);
        assert!(result.verified);
    }
}
