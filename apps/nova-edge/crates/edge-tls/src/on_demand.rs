//! On-demand TLS certificate resolution.
//!
//! Implements `rustls::server::ResolvesServerCert` to dynamically resolve
//! certificates based on the SNI hostname. Only serves certs for hosts that
//! are active in the SurrealDB live cache.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use rustls::server::ResolvesServerCert;
use rustls::sign::CertifiedKey;

use edge_store::live_cache::LiveCache;

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
    fn resolve(
        &self,
        client_hello: rustls::server::ClientHello<'_>,
    ) -> Option<Arc<CertifiedKey>> {
        match client_hello.server_name() {
            Some(host) => self.resolve_for_host(host),
            None => self.resolve_default(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::certs::CertStorage;

    fn make_cert(host: &str) -> Arc<CertifiedKey> {
        let (cert_pem, key_pem) = CertStorage::generate_self_signed(host).unwrap();
        let certs: Vec<_> = rustls_pemfile::certs(&mut &cert_pem[..])
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        let key = rustls_pemfile::private_key(&mut &key_pem[..])
            .unwrap()
            .unwrap();
        let signing_key = rustls::crypto::ring::sign::any_private_key_type(&key).unwrap();
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
