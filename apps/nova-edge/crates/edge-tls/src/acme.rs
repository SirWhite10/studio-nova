//! Production ACME issuer integration.
//!
//! Nova Edge serves HTTP-01 challenge files from the port-80 webroot and
//! delegates certificate issuance to an external ACME client (`lego` by
//! default). Keeping the issuer behind a trait lets the rustls SNI resolver stay
//! synchronous and testable while still enforcing the production fallback policy.

use std::path::PathBuf;
use std::process::Command;

use crate::certs::CertStorage;
use crate::on_demand::{AcmeIssueError, AcmeIssuer};

#[derive(Debug, Clone)]
pub struct ExternalCommandAcmeIssuer {
    command: String,
    email: String,
    directory_url: String,
    cache_dir: PathBuf,
    webroot_dir: PathBuf,
}

impl ExternalCommandAcmeIssuer {
    pub fn new(
        command: impl Into<String>,
        email: impl Into<String>,
        directory_url: impl Into<String>,
        cache_dir: impl Into<PathBuf>,
        webroot_dir: impl Into<PathBuf>,
    ) -> Self {
        Self {
            command: command.into(),
            email: email.into(),
            directory_url: directory_url.into(),
            cache_dir: cache_dir.into(),
            webroot_dir: webroot_dir.into(),
        }
    }

    fn lego_cert_path(&self, host: &str) -> PathBuf {
        self.cache_dir
            .join("certificates")
            .join(format!("{host}.crt"))
    }

    fn lego_key_path(&self, host: &str) -> PathBuf {
        self.cache_dir
            .join("certificates")
            .join(format!("{host}.key"))
    }

    fn ensure_dirs(&self) -> Result<(), AcmeIssueError> {
        std::fs::create_dir_all(&self.cache_dir)
            .map_err(|e| AcmeIssueError::Command(format!("create ACME cache dir: {e}")))?;
        std::fs::create_dir_all(&self.webroot_dir)
            .map_err(|e| AcmeIssueError::Command(format!("create ACME webroot dir: {e}")))?;
        Ok(())
    }
}

impl AcmeIssuer for ExternalCommandAcmeIssuer {
    fn issue(&self, host: &str, storage: &CertStorage) -> Result<(), AcmeIssueError> {
        self.ensure_dirs()?;

        let existing_cert = self.lego_cert_path(host);
        let existing_key = self.lego_key_path(host);
        if existing_cert.exists() && existing_key.exists() {
            let cert_pem = std::fs::read(&existing_cert).map_err(|e| {
                AcmeIssueError::Command(format!("read cached ACME cert for {host}: {e}"))
            })?;
            let key_pem = std::fs::read(&existing_key).map_err(|e| {
                AcmeIssueError::Command(format!("read cached ACME key for {host}: {e}"))
            })?;
            storage.store_cert(host, &cert_pem, &key_pem)?;
            return Ok(());
        }

        let output = Command::new(&self.command)
            .arg("--accept-tos")
            .arg("--email")
            .arg(&self.email)
            .arg("--domains")
            .arg(host)
            .arg("--path")
            .arg(&self.cache_dir)
            .arg("--server")
            .arg(&self.directory_url)
            .arg("--http")
            .arg("--http.webroot")
            .arg(&self.webroot_dir)
            .arg("run")
            .output()
            .map_err(|e| {
                AcmeIssueError::Command(format!("failed to execute {}: {e}", self.command))
            })?;

        if !output.status.success() {
            return Err(AcmeIssueError::Command(format!(
                "{} exited with {}: stdout={} stderr={}",
                self.command,
                output.status,
                String::from_utf8_lossy(&output.stdout),
                String::from_utf8_lossy(&output.stderr)
            )));
        }

        let cert_pem = std::fs::read(self.lego_cert_path(host))
            .map_err(|e| AcmeIssueError::Command(format!("read issued cert for {host}: {e}")))?;
        let key_pem = std::fs::read(self.lego_key_path(host))
            .map_err(|e| AcmeIssueError::Command(format!("read issued key for {host}: {e}")))?;

        storage.store_cert(host, &cert_pem, &key_pem)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn external_issuer_uses_lego_certificate_paths() {
        let issuer = ExternalCommandAcmeIssuer::new(
            "lego",
            "ops@example.com",
            "https://acme-staging-v02.api.letsencrypt.org/directory",
            "/tmp/acme-cache",
            "/tmp/acme-webroot",
        );

        assert_eq!(
            issuer.lego_cert_path("app.example.com"),
            PathBuf::from("/tmp/acme-cache/certificates/app.example.com.crt")
        );
        assert_eq!(
            issuer.lego_key_path("app.example.com"),
            PathBuf::from("/tmp/acme-cache/certificates/app.example.com.key")
        );
    }
}
