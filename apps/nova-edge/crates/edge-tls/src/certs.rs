//! Certificate provisioning and storage.
//!
//! Manages TLS certificates using a directory-based cache.
//! In production, certificates are auto-provisioned via ACME (Let's Encrypt).
//! For testing, self-signed certs are generated with `rcgen`.

use std::path::{Path, PathBuf};
use std::sync::Arc;

use rcgen::{CertificateParams, DnType, KeyPair};
use rustls::pki_types::{CertificateDer, PrivateKeyDer, PrivatePkcs8KeyDer};
use rustls::sign::CertifiedKey;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CertError {
    #[error("certificate generation failed: {0}")]
    Generation(String),
    #[error("certificate IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("certificate parse error: {0}")]
    Parse(String),
}

/// Manages TLS certificate storage and retrieval.
///
/// Certificates are stored on disk in a directory hierarchy:
/// ```text
/// cache_dir/
///   <domain>/
///     cert.pem      — full certificate chain (PEM)
///     key.pem       — private key (PEM)
/// ```
pub struct CertStorage {
    cache_dir: PathBuf,
}

impl CertStorage {
    /// Create a new cert storage backed by the given directory.
    pub fn new(cache_dir: impl Into<PathBuf>) -> Self {
        Self {
            cache_dir: cache_dir.into(),
        }
    }

    /// Return the cache directory path.
    pub fn cache_dir(&self) -> &Path {
        &self.cache_dir
    }

    /// Check whether a cached cert exists for the given domain.
    pub fn has_cert(&self, domain: &str) -> bool {
        let cert_path = self.cert_path(domain);
        let key_path = self.key_path(domain);
        cert_path.exists() && key_path.exists()
    }

    /// Store a PEM-encoded certificate chain + key for a domain.
    pub fn store_cert(&self, domain: &str, cert_pem: &[u8], key_pem: &[u8]) -> Result<(), CertError> {
        let dir = self.domain_dir(domain);
        std::fs::create_dir_all(&dir)?;
        std::fs::write(self.cert_path(domain), cert_pem)?;
        std::fs::write(self.key_path(domain), key_pem)?;
        Ok(())
    }

    /// Load a stored certificate for a domain, returning a `CertifiedKey`.
    pub fn load_cert(&self, domain: &str) -> Result<Option<Arc<CertifiedKey>>, CertError> {
        if !self.has_cert(domain) {
            return Ok(None);
        }
        let cert_pem = std::fs::read(self.cert_path(domain))?;
        let key_pem = std::fs::read(self.key_path(domain))?;

        let certs = parse_cert_chain(&cert_pem)?;
        let key = parse_private_key(&key_pem)?;

        let certified_key = CertifiedKey::new(certs, key);
        Ok(Some(Arc::new(certified_key)))
    }

    /// Remove a stored certificate for a domain.
    pub fn remove_cert(&self, domain: &str) -> Result<bool, CertError> {
        if !self.has_cert(domain) {
            return Ok(false);
        }
        let dir = self.domain_dir(domain);
        std::fs::remove_dir_all(dir)?;
        Ok(true)
    }

    /// List all domains that have cached certificates.
    pub fn list_domains(&self) -> Result<Vec<String>, CertError> {
        if !self.cache_dir.exists() {
            return Ok(Vec::new());
        }
        let mut domains = Vec::new();
        for entry in std::fs::read_dir(&self.cache_dir)? {
            let entry = entry?;
            if entry.file_type()?.is_dir() {
                let name = entry.file_name().to_string_lossy().to_string();
                if self.has_cert(&name) {
                    domains.push(name);
                }
            }
        }
        Ok(domains)
    }

    /// Generate a self-signed certificate for testing.
    /// Returns (cert_pem, key_pem).
    pub fn generate_self_signed(domain: &str) -> Result<(Vec<u8>, Vec<u8>), CertError> {
        let mut params = CertificateParams::new(vec![domain.to_string()])
            .map_err(|e| CertError::Generation(e.to_string()))?;
        params
            .distinguished_name
            .push(DnType::CommonName, "Nova Edge Test");

        let key_pair =
            KeyPair::generate().map_err(|e| CertError::Generation(e.to_string()))?;
        let cert = params
            .self_signed(&key_pair)
            .map_err(|e| CertError::Generation(e.to_string()))?;

        let cert_pem = cert.pem();
        let key_pem = key_pair.serialize_pem();

        Ok((cert_pem.into_bytes(), key_pem.into_bytes()))
    }

    fn domain_dir(&self, domain: &str) -> PathBuf {
        self.cache_dir.join(domain)
    }

    fn cert_path(&self, domain: &str) -> PathBuf {
        self.cache_dir.join(domain).join("cert.pem")
    }

    fn key_path(&self, domain: &str) -> PathBuf {
        self.cache_dir.join(domain).join("key.pem")
    }
}

/// Parse a PEM certificate chain into rustls certificates.
fn parse_cert_chain(pem: &[u8]) -> Result<Vec<CertificateDer<'static>>, CertError> {
    let pem_str = std::str::from_utf8(pem)
        .map_err(|e| CertError::Parse(format!("invalid UTF-8: {}", e)))?;
    let mut certs = Vec::new();
    for block in pem::parse_many(pem_str)
        .map_err(|e| CertError::Parse(format!("PEM parse: {}", e)))?
    {
        if block.tag() == "CERTIFICATE" {
            certs.push(CertificateDer::from(block.contents().to_vec()));
        }
    }
    if certs.is_empty() {
        return Err(CertError::Parse("no certificates found in PEM".into()));
    }
    Ok(certs)
}

/// Parse a PEM private key into a rustls signing key.
fn parse_private_key(pem: &[u8]) -> Result<Arc<dyn rustls::sign::SigningKey>, CertError> {
    let pem_str = std::str::from_utf8(pem)
        .map_err(|e| CertError::Parse(format!("invalid UTF-8: {}", e)))?;
    let blocks = pem::parse_many(pem_str)
        .map_err(|e| CertError::Parse(format!("PEM parse: {}", e)))?;

    for block in blocks {
        if block.tag() == "PRIVATE KEY" {
            let key = PrivateKeyDer::from(PrivatePkcs8KeyDer::from(block.contents().to_vec()));
            return rustls::crypto::ring::sign::any_supported_type(&key)
                .map_err(|e| CertError::Parse(format!("unsupported key type: {}", e)));
        }
    }
    Err(CertError::Parse("no private key found in PEM".into()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_self_signed_generation() {
        let (cert, key) = CertStorage::generate_self_signed("test.example.com").unwrap();
        assert!(!cert.is_empty());
        assert!(!key.is_empty());
        assert!(String::from_utf8_lossy(&cert).contains("CERTIFICATE"));
        assert!(String::from_utf8_lossy(&key).contains("PRIVATE KEY"));
    }

    #[test]
    fn test_store_and_load_cert() {
        let dir = tempfile::tempdir().unwrap();
        let storage = CertStorage::new(dir.path());

        let (cert_pem, key_pem) = CertStorage::generate_self_signed("acme.example.com").unwrap();

        // Initially no cert
        assert!(!storage.has_cert("acme.example.com"));
        assert!(storage.load_cert("acme.example.com").unwrap().is_none());

        // Store
        storage
            .store_cert("acme.example.com", &cert_pem, &key_pem)
            .unwrap();
        assert!(storage.has_cert("acme.example.com"));

        // Load
        let loaded = storage.load_cert("acme.example.com").unwrap().unwrap();
        assert_eq!(loaded.cert.len(), 1, "should have exactly 1 certificate");
    }

    #[test]
    fn test_remove_cert() {
        let dir = tempfile::tempdir().unwrap();
        let storage = CertStorage::new(dir.path());

        let (cert, key) = CertStorage::generate_self_signed("remove.example.com").unwrap();
        storage.store_cert("remove.example.com", &cert, &key).unwrap();
        assert!(storage.has_cert("remove.example.com"));

        let removed = storage.remove_cert("remove.example.com").unwrap();
        assert!(removed);
        assert!(!storage.has_cert("remove.example.com"));

        // Removing again returns false
        let removed2 = storage.remove_cert("remove.example.com").unwrap();
        assert!(!removed2);
    }

    #[test]
    fn test_list_domains() {
        let dir = tempfile::tempdir().unwrap();
        let storage = CertStorage::new(dir.path());

        assert!(storage.list_domains().unwrap().is_empty());

        for domain in &["a.example.com", "b.example.com", "c.example.com"] {
            let (cert, key) = CertStorage::generate_self_signed(domain).unwrap();
            storage.store_cert(domain, &cert, &key).unwrap();
        }

        let mut domains = storage.list_domains().unwrap();
        domains.sort();
        assert_eq!(
            domains,
            vec!["a.example.com", "b.example.com", "c.example.com"]
        );
    }

    #[test]
    fn test_nonexistent_domain_returns_none() {
        let dir = tempfile::tempdir().unwrap();
        let storage = CertStorage::new(dir.path());
        assert!(storage.load_cert("nope.example.com").unwrap().is_none());
    }

    #[test]
    fn test_cache_dir_path() {
        let storage = CertStorage::new("/tmp/test-certs");
        assert_eq!(storage.cache_dir(), Path::new("/tmp/test-certs"));
    }
}
