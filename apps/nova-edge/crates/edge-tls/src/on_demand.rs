//! On-demand TLS certificate resolution.
//!
//! Implements `rustls::server::ResolvesServerCert` to dynamically resolve
//! certificates based on the SNI hostname. Only serves certs for hosts that
//! are active in the SurrealDB live cache.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use rustls::server::ResolvesServerCert;
use rustls::sign::CertifiedKey;
use thiserror::Error;

use edge_store::live_cache::LiveCache;

use crate::certs::{CertError, CertStorage};

/// Policy for deciding whether a host should get a TLS certificate.
pub trait HostPolicy: Send + Sync {
    /// Returns true if the host is allowed to serve TLS.
    fn is_allowed(&self, host: &str) -> bool;
}

/// A host policy that checks the SurrealDB live cache.
pub struct LiveCacheHostPolicy {
    cache: Arc<LiveCache>,
}

impl LiveCacheHostPolicy {
    pub fn new(cache: Arc<LiveCache>) -> Self {
        Self { cache }
    }
}

impl HostPolicy for LiveCacheHostPolicy {
    fn is_allowed(&self, host: &str) -> bool {
        self.cache.is_host_active(host)
    }
}

/// A host policy that allows a fixed set of hosts (for testing).
pub struct StaticHostPolicy {
    allowed: Vec<String>,
}

impl StaticHostPolicy {
    pub fn new(allowed: Vec<&str>) -> Self {
        Self {
            allowed: allowed.iter().map(|s| s.to_string()).collect(),
        }
    }

    pub fn allow_all() -> Self {
        // Empty means allow all
        Self { allowed: vec![] }
    }
}

impl HostPolicy for StaticHostPolicy {
    fn is_allowed(&self, host: &str) -> bool {
        self.allowed.is_empty() || self.allowed.iter().any(|a| a == host)
    }
}

/// On-demand TLS certificate resolver.
///
/// Resolves certificates based on SNI hostname:
/// 1. Checks the host policy (is this host allowed?)
/// 2. Looks up a pre-loaded certificate for the host
/// 3. Returns the cert if found, or None (TLS handshake fails)
pub struct OnDemandResolver {
    policy: Arc<dyn HostPolicy>,
    certs: Mutex<HashMap<String, Arc<CertifiedKey>>>,
    /// Optional fallback cert for when no SNI is provided.
    default_cert: Mutex<Option<Arc<CertifiedKey>>>,
}

impl std::fmt::Debug for OnDemandResolver {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("OnDemandResolver")
            .field("cert_count", &self.certs.lock().unwrap().len())
            .field("has_default", &self.default_cert.lock().unwrap().is_some())
            .finish_non_exhaustive()
    }
}

impl OnDemandResolver {
    pub fn new(policy: Arc<dyn HostPolicy>) -> Self {
        Self {
            policy,
            certs: Mutex::new(HashMap::new()),
            default_cert: Mutex::new(None),
        }
    }

    /// Register a certificate for a specific host.
    pub fn register(&self, host: &str, cert: Arc<CertifiedKey>) {
        self.certs.lock().unwrap().insert(host.to_string(), cert);
    }

    /// Remove a certificate for a host.
    pub fn unregister(&self, host: &str) -> bool {
        self.certs.lock().unwrap().remove(host).is_some()
    }

    /// Set the default certificate (used when no SNI is provided).
    pub fn set_default(&self, cert: Arc<CertifiedKey>) {
        *self.default_cert.lock().unwrap() = Some(cert);
    }

    /// Number of registered host certs.
    pub fn cert_count(&self) -> usize {
        self.certs.lock().unwrap().len()
    }

    /// Resolve a cert for the given hostname (test-friendly).
    /// This mirrors the logic in `ResolvesServerCert::resolve` but takes
    /// a plain string instead of a `ClientHello`.
    pub fn resolve_for_host(&self, host: &str) -> Option<Arc<CertifiedKey>> {
        if !self.policy.is_allowed(host) {
            return None;
        }
        self.certs.lock().unwrap().get(host).cloned()
    }

    /// Resolve the default cert (for no-SNI cases).
    pub fn resolve_default(&self) -> Option<Arc<CertifiedKey>> {
        self.default_cert.lock().unwrap().clone()
    }
}

impl ResolvesServerCert for OnDemandResolver {
    fn resolve(&self, client_hello: rustls::server::ClientHello<'_>) -> Option<Arc<CertifiedKey>> {
        match client_hello.server_name() {
            Some(host) => self.resolve_for_host(host),
            None => self.resolve_default(),
        }
    }
}

/// Error returned by a production ACME issuer.
#[derive(Debug, Error)]
pub enum AcmeIssueError {
    #[error("issuer command failed: {0}")]
    Command(String),
    #[error("certificate storage error: {0}")]
    Storage(#[from] CertError),
}

/// Synchronous certificate issuer used by rustls SNI resolution.
///
/// The production implementation shells out to an ACME client that can satisfy
/// HTTP-01 through the configured webroot. Tests inject a mock issuer.
pub trait AcmeIssuer: Send + Sync {
    fn issue(&self, host: &str, storage: &CertStorage) -> Result<(), AcmeIssueError>;
}

/// Production ACME resolver.
///
/// On a TLS handshake it:
/// 1. Rejects hosts not allowed by policy.
/// 2. Serves an already-loaded certificate.
/// 3. Loads a cached certificate from disk if present.
/// 4. Requests a missing cert from the configured ACME issuer.
/// 5. Optionally falls back to self-signed only when explicitly enabled.
pub struct ProductionAcmeResolver {
    policy: Arc<dyn HostPolicy>,
    storage: Arc<CertStorage>,
    issuer: Arc<dyn AcmeIssuer>,
    self_signed_fallback: bool,
    certs: Arc<Mutex<HashMap<String, Arc<CertifiedKey>>>>,
    issue_attempts: Arc<Mutex<HashMap<String, usize>>>,
    issuing: Arc<Mutex<HashMap<String, bool>>>,
    default_cert: Mutex<Option<Arc<CertifiedKey>>>,
}

impl std::fmt::Debug for ProductionAcmeResolver {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ProductionAcmeResolver")
            .field("cert_count", &self.certs.lock().unwrap().len())
            .field("self_signed_fallback", &self.self_signed_fallback)
            .field("has_default", &self.default_cert.lock().unwrap().is_some())
            .finish_non_exhaustive()
    }
}

impl ProductionAcmeResolver {
    pub fn new(
        policy: Arc<dyn HostPolicy>,
        storage: Arc<CertStorage>,
        issuer: Arc<dyn AcmeIssuer>,
        self_signed_fallback: bool,
    ) -> Self {
        Self {
            policy,
            storage,
            issuer,
            self_signed_fallback,
            certs: Arc::new(Mutex::new(HashMap::new())),
            issue_attempts: Arc::new(Mutex::new(HashMap::new())),
            issuing: Arc::new(Mutex::new(HashMap::new())),
            default_cert: Mutex::new(None),
        }
    }

    pub fn register(&self, host: &str, cert: Arc<CertifiedKey>) {
        self.certs.lock().unwrap().insert(host.to_string(), cert);
    }

    pub fn unregister(&self, host: &str) -> bool {
        self.certs.lock().unwrap().remove(host).is_some()
    }

    pub fn set_default(&self, cert: Arc<CertifiedKey>) {
        *self.default_cert.lock().unwrap() = Some(cert);
    }

    pub fn cert_count(&self) -> usize {
        self.certs.lock().unwrap().len()
    }

    pub fn issue_attempts(&self, host: &str) -> usize {
        *self.issue_attempts.lock().unwrap().get(host).unwrap_or(&0)
    }

    pub fn resolve_default(&self) -> Option<Arc<CertifiedKey>> {
        self.default_cert.lock().unwrap().clone()
    }

    pub fn resolve_for_host(&self, host: &str) -> Option<Arc<CertifiedKey>> {
        if !is_valid_hostname(host) || !self.policy.is_allowed(host) {
            return None;
        }

        if let Some(cert) = self.certs.lock().unwrap().get(host).cloned() {
            return Some(cert);
        }

        match self.storage.load_cert(host) {
            Ok(Some(cert)) => {
                self.register(host, cert.clone());
                return Some(cert);
            }
            Ok(None) => {}
            Err(e) => tracing::warn!(host = %host, error = %e, "cached TLS cert failed to load"),
        }

        let should_start_issue = {
            let mut issuing = self.issuing.lock().unwrap();
            if issuing.contains_key(host) {
                false
            } else {
                issuing.insert(host.to_string(), true);
                true
            }
        };

        if should_start_issue {
            {
                let mut attempts = self.issue_attempts.lock().unwrap();
                *attempts.entry(host.to_string()).or_insert(0) += 1;
            }
            let host_owned = host.to_string();
            let storage = self.storage.clone();
            let issuer = self.issuer.clone();
            let certs = self.certs.clone();
            let issuing = self.issuing.clone();
            std::thread::spawn(move || {
                let result = issuer.issue(&host_owned, &storage).and_then(|()| {
                    storage.load_cert(&host_owned)?.ok_or_else(|| {
                        AcmeIssueError::Storage(CertError::Parse(
                            "ACME issuer completed without cached cert".into(),
                        ))
                    })
                });
                match result {
                    Ok(cert) => {
                        certs.lock().unwrap().insert(host_owned.clone(), cert);
                        tracing::info!(host = %host_owned, "ACME certificate issued and cached");
                    }
                    Err(e) => {
                        tracing::warn!(host = %host_owned, error = %e, "ACME issuance failed")
                    }
                }
                issuing.lock().unwrap().remove(&host_owned);
            });
        }

        if self.self_signed_fallback {
            tracing::warn!(host = %host, "ACME failed; generating explicitly-enabled degraded self-signed fallback cert");
            match CertStorage::generate_self_signed(host).and_then(|(cert_pem, key_pem)| {
                self.storage.store_cert(host, &cert_pem, &key_pem)?;
                self.storage
                    .load_cert(host)?
                    .ok_or_else(|| CertError::Parse("generated cert was not loadable".into()))
            }) {
                Ok(cert) => {
                    self.register(host, cert.clone());
                    Some(cert)
                }
                Err(e) => {
                    tracing::warn!(host = %host, error = %e, "fallback cert generation failed");
                    None
                }
            }
        } else {
            None
        }
    }
}

impl ResolvesServerCert for ProductionAcmeResolver {
    fn resolve(&self, client_hello: rustls::server::ClientHello<'_>) -> Option<Arc<CertifiedKey>> {
        match client_hello.server_name() {
            Some(host) => self.resolve_for_host(host),
            None => self.resolve_default(),
        }
    }
}

fn is_valid_hostname(host: &str) -> bool {
    if host.is_empty() || host.len() > 253 || host.parse::<std::net::IpAddr>().is_ok() {
        return false;
    }
    host.split('.').all(|label| {
        !label.is_empty()
            && label.len() <= 63
            && !label.starts_with('-')
            && !label.ends_with('-')
            && label
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'-')
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::certs::CertStorage;

    struct MockIssuer {
        hosts: Mutex<HashMap<String, (Vec<u8>, Vec<u8>)>>,
    }

    impl MockIssuer {
        fn new() -> Self {
            Self {
                hosts: Mutex::new(HashMap::new()),
            }
        }

        fn add_cert(&self, host: &str) {
            let cert = CertStorage::generate_self_signed(host).unwrap();
            self.hosts.lock().unwrap().insert(host.to_string(), cert);
        }
    }

    impl AcmeIssuer for MockIssuer {
        fn issue(&self, host: &str, storage: &CertStorage) -> Result<(), AcmeIssueError> {
            let Some((cert_pem, key_pem)) = self.hosts.lock().unwrap().get(host).cloned() else {
                return Err(AcmeIssueError::Command("mock issuer has no cert".into()));
            };
            storage.store_cert(host, &cert_pem, &key_pem)?;
            Ok(())
        }
    }

    fn make_cert(host: &str) -> Arc<CertifiedKey> {
        let (cert_pem, key_pem) = CertStorage::generate_self_signed(host).unwrap();
        let certs: Vec<_> = rustls_pemfile::certs(&mut &cert_pem[..])
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        let key = rustls_pemfile::private_key(&mut &key_pem[..])
            .unwrap()
            .unwrap();
        let signing_key = rustls::crypto::ring::sign::any_supported_type(&key).unwrap();
        Arc::new(CertifiedKey::new(certs, signing_key))
    }

    #[test]
    fn test_static_policy_allow_specific() {
        let policy = StaticHostPolicy::new(vec!["app.example.com", "admin.example.com"]);
        assert!(policy.is_allowed("app.example.com"));
        assert!(policy.is_allowed("admin.example.com"));
        assert!(!policy.is_allowed("evil.example.com"));
    }

    #[test]
    fn test_static_policy_allow_all() {
        let policy = StaticHostPolicy::allow_all();
        assert!(policy.is_allowed("anything.example.com"));
        assert!(policy.is_allowed("random.host.org"));
    }

    #[test]
    fn test_resolver_allowed_host_with_cert() {
        let policy = Arc::new(StaticHostPolicy::new(vec!["app.example.com"]));
        let resolver = OnDemandResolver::new(policy);

        let cert = make_cert("app.example.com");
        resolver.register("app.example.com", cert);

        assert_eq!(resolver.cert_count(), 1);
    }

    #[test]
    fn test_resolver_unregister() {
        let policy = Arc::new(StaticHostPolicy::allow_all());
        let resolver = OnDemandResolver::new(policy);

        let cert = make_cert("test.example.com");
        resolver.register("test.example.com", cert);
        assert_eq!(resolver.cert_count(), 1);

        assert!(resolver.unregister("test.example.com"));
        assert_eq!(resolver.cert_count(), 0);

        assert!(!resolver.unregister("test.example.com"));
    }

    #[test]
    fn test_resolver_resolves_allowed_host() {
        let policy = Arc::new(StaticHostPolicy::new(vec!["app.example.com"]));
        let resolver = OnDemandResolver::new(policy);

        let cert = make_cert("app.example.com");
        resolver.register("app.example.com", cert.clone());

        let result = resolver.resolve_for_host("app.example.com");
        assert!(result.is_some());
        let resolved = result.unwrap();
        assert_eq!(resolved.cert.len(), cert.cert.len());
    }

    #[test]
    fn test_resolver_rejects_disallowed_host() {
        let policy = Arc::new(StaticHostPolicy::new(vec!["allowed.example.com"]));
        let resolver = OnDemandResolver::new(policy);

        let cert = make_cert("disallowed.example.com");
        resolver.register("disallowed.example.com", cert);

        let result = resolver.resolve_for_host("disallowed.example.com");
        assert!(result.is_none(), "host not in policy should be rejected");
    }

    #[test]
    fn test_resolver_rejects_host_without_cert() {
        let policy = Arc::new(StaticHostPolicy::allow_all());
        let resolver = OnDemandResolver::new(policy);

        let result = resolver.resolve_for_host("nocert.example.com");
        assert!(result.is_none(), "host with no cert should return None");
    }

    #[test]
    fn test_resolver_default_cert() {
        let policy = Arc::new(StaticHostPolicy::allow_all());
        let resolver = OnDemandResolver::new(policy);

        let cert = make_cert("default.example.com");
        resolver.set_default(cert);

        let default = resolver.resolve_default();
        assert!(default.is_some());
    }

    #[test]
    fn production_resolver_issues_missing_allowed_cert_and_caches_it() {
        let dir = tempfile::tempdir().unwrap();
        let storage = Arc::new(CertStorage::new(dir.path()));
        let issuer = Arc::new(MockIssuer::new());
        issuer.add_cert("issue.example.com");
        let policy = Arc::new(StaticHostPolicy::new(vec!["issue.example.com"]));
        let resolver = ProductionAcmeResolver::new(policy, storage, issuer, false);

        assert_eq!(resolver.cert_count(), 0);
        let cert = resolver.resolve_for_host("issue.example.com");

        assert!(
            cert.is_none(),
            "first handshake should start background ACME issuance"
        );
        for _ in 0..50 {
            if resolver.cert_count() == 1 {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(10));
        }
        assert_eq!(resolver.cert_count(), 1);
        assert_eq!(resolver.issue_attempts("issue.example.com"), 1);
        assert!(resolver.resolve_for_host("issue.example.com").is_some());
    }

    #[test]
    fn production_resolver_does_not_self_sign_unless_fallback_enabled() {
        let dir = tempfile::tempdir().unwrap();
        let storage = Arc::new(CertStorage::new(dir.path()));
        let issuer = Arc::new(MockIssuer::new());
        let policy = Arc::new(StaticHostPolicy::new(vec!["fallback.example.com"]));
        let resolver = ProductionAcmeResolver::new(policy, storage, issuer, false);

        assert!(resolver.resolve_for_host("fallback.example.com").is_none());
        assert_eq!(resolver.cert_count(), 0);
    }

    #[test]
    fn production_resolver_self_signs_only_when_fallback_enabled() {
        let dir = tempfile::tempdir().unwrap();
        let storage = Arc::new(CertStorage::new(dir.path()));
        let issuer = Arc::new(MockIssuer::new());
        let policy = Arc::new(StaticHostPolicy::new(vec!["fallback.example.com"]));
        let resolver = ProductionAcmeResolver::new(policy, storage, issuer, true);

        assert!(resolver.resolve_for_host("fallback.example.com").is_some());
        assert_eq!(resolver.cert_count(), 1);
    }

    #[test]
    fn test_multiple_hosts() {
        let policy = Arc::new(StaticHostPolicy::allow_all());
        let resolver = OnDemandResolver::new(policy);

        for host in &["a.example.com", "b.example.com", "c.example.com"] {
            let cert = make_cert(host);
            resolver.register(host, cert);
        }

        assert_eq!(resolver.cert_count(), 3);
        assert!(resolver.resolve_for_host("a.example.com").is_some());
        assert!(resolver.resolve_for_host("b.example.com").is_some());
        assert!(resolver.resolve_for_host("c.example.com").is_some());
        assert!(resolver.resolve_for_host("d.example.com").is_none());
    }
}
