//! TLS HTTPS server.
//!
//! Wraps an axum router with `tokio-rustls` TLS termination using
//! the on-demand certificate resolver from `on_demand`.

use std::net::SocketAddr;
use std::sync::Arc;

use axum::Router;
use hyper_util::rt::{TokioExecutor, TokioIo};
use hyper_util::service::TowerToHyperService;
use tokio::net::TcpListener;
use tokio_rustls::TlsAcceptor;

use rustls::server::ServerConfig;

use crate::on_demand::OnDemandResolver;

/// Builds a `rustls::ServerConfig` using the on-demand resolver.
pub fn build_tls_server_config(resolver: Arc<OnDemandResolver>) -> Arc<ServerConfig> {
    let mut config = ServerConfig::builder()
        .with_no_client_auth()
        .with_cert_resolver(resolver);

    // Support HTTP/1.1 and HTTP/2 via ALPN
    config.alpn_protocols = vec![b"h2".to_vec(), b"http/1.1".to_vec()];

    Arc::new(config)
}

/// Binds a HTTPS server on the given address and serves the axum app.
///
/// Returns the actual bound address (useful when binding to port 0 for tests).
pub async fn serve_https(
    addr: SocketAddr,
    app: Router,
    tls_config: Arc<ServerConfig>,
) -> Result<SocketAddr, std::io::Error> {
    let listener = TcpListener::bind(addr).await?;
    let bound_addr = listener.local_addr()?;
    let acceptor = TlsAcceptor::from(tls_config);

    tokio::spawn(async move {
        loop {
            match listener.accept().await {
                Ok((stream, _remote)) => {
                    let acceptor = acceptor.clone();
                    let app = app.clone();
                    tokio::spawn(async move {
                        match acceptor.accept(stream).await {
                            Ok(tls_stream) => {
                                let io = TokioIo::new(tls_stream);
                                let builder =
                                    hyper_util::server::conn::auto::Builder::new(TokioExecutor::new());
                                // Router's into_service() returns a tower::Service,
                                // but hyper-util needs a hyper::Service — wrap it.
                                let svc = TowerToHyperService::new(app.into_service());
                                let _ = builder.serve_connection_with_upgrades(io, svc).await;
                            }
                            Err(e) => {
                                tracing::debug!("TLS handshake failed: {}", e);
                            }
                        }
                    });
                }
                Err(e) => {
                    tracing::warn!("TCP accept error: {}", e);
                }
            }
        }
    });

    Ok(bound_addr)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::certs::CertStorage;
    use crate::on_demand::{OnDemandResolver, StaticHostPolicy};
    use axum::routing::get;
    use rustls::client::danger::{
        HandshakeSignatureValid, ServerCertVerified, ServerCertVerifier,
    };
    use rustls::crypto::ring::sign::any_supported_type;
    use rustls::pki_types::{CertificateDer, ServerName};
    use rustls::{ClientConfig, DigitallySignedStruct, Error as TlsError, SignatureScheme};
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    fn make_certified_key(host: &str) -> Arc<rustls::sign::CertifiedKey> {
        let (cert_pem, key_pem) = CertStorage::generate_self_signed(host).unwrap();
        let certs: Vec<_> = rustls_pemfile::certs(&mut &cert_pem[..])
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        let key = rustls_pemfile::private_key(&mut &key_pem[..])
            .unwrap()
            .unwrap();
        let signing_key = any_supported_type(&key).unwrap();
        Arc::new(rustls::sign::CertifiedKey::new(certs, signing_key))
    }

    /// A verifier that accepts any certificate (for testing only).
    #[derive(Debug)]
    struct NoVerifier;

    impl ServerCertVerifier for NoVerifier {
        fn verify_server_cert(
            &self,
            _end_entity: &CertificateDer<'_>,
            _intermediates: &[CertificateDer<'_>],
            _server_name: &ServerName<'_>,
            _ocsp_response: &[u8],
            _now: rustls::pki_types::UnixTime,
        ) -> Result<ServerCertVerified, TlsError> {
            Ok(ServerCertVerified::assertion())
        }

        fn verify_tls12_signature(
            &self,
            _message: &[u8],
            _cert: &CertificateDer<'_>,
            _dss: &DigitallySignedStruct,
        ) -> Result<HandshakeSignatureValid, TlsError> {
            Ok(HandshakeSignatureValid::assertion())
        }

        fn verify_tls13_signature(
            &self,
            _message: &[u8],
            _cert: &CertificateDer<'_>,
            _dss: &DigitallySignedStruct,
        ) -> Result<HandshakeSignatureValid, TlsError> {
            Ok(HandshakeSignatureValid::assertion())
        }

        fn supported_verify_schemes(&self) -> Vec<SignatureScheme> {
            vec![
                SignatureScheme::ECDSA_NISTP256_SHA256,
                SignatureScheme::ECDSA_NISTP384_SHA384,
                SignatureScheme::RSA_PKCS1_SHA256,
                SignatureScheme::RSA_PKCS1_SHA384,
                SignatureScheme::RSA_PKCS1_SHA512,
                SignatureScheme::ED25519,
            ]
        }
    }

    fn make_client_config() -> ClientConfig {
        let mut config = ClientConfig::builder()
            .dangerous()
            .with_custom_certificate_verifier(Arc::new(NoVerifier))
            .with_no_client_auth();
        config.alpn_protocols = vec![b"http/1.1".to_vec()];
        config
    }

    #[test]
    fn test_tls_config_builds_successfully() {
        let policy = Arc::new(StaticHostPolicy::allow_all());
        let resolver = Arc::new(OnDemandResolver::new(policy));
        let config = build_tls_server_config(resolver);

        assert!(config.alpn_protocols.contains(&b"h2".to_vec()));
        assert!(config.alpn_protocols.contains(&b"http/1.1".to_vec()));
    }

    #[tokio::test]
    async fn test_https_server_full_roundtrip() {
        let policy = Arc::new(StaticHostPolicy::allow_all());
        let resolver = Arc::new(OnDemandResolver::new(policy));

        let host = "roundtrip.local";
        let cert = make_certified_key(host);
        resolver.register(host, cert);

        let tls_config = build_tls_server_config(resolver);
        let app = Router::new().route("/", get(|| async { "hello tls" }));

        let addr = serve_https(
            "127.0.0.1:0".parse().unwrap(),
            app,
            tls_config,
        )
        .await
        .unwrap();

        // Connect as a TLS client
        let client_config = make_client_config();
        let connector = tokio_rustls::TlsConnector::from(Arc::new(client_config));

        let stream = tokio::net::TcpStream::connect(addr).await.unwrap();
        let server_name = ServerName::try_from(host).unwrap();
        let mut tls_stream = connector.connect(server_name, stream).await.unwrap();

        // Send raw HTTP/1.1 request
        let request = format!(
            "GET / HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n",
            host
        );
        tls_stream.write_all(request.as_bytes()).await.unwrap();
        tls_stream.shutdown().await.unwrap();

        let mut response = Vec::new();
        tls_stream.read_to_end(&mut response).await.unwrap();
        let response_str = String::from_utf8(response).unwrap();
        assert!(response_str.contains("hello tls"));
        assert!(response_str.contains("HTTP/1.1 200"));
    }

    #[tokio::test]
    async fn test_https_rejects_unknown_host() {
        let policy = Arc::new(StaticHostPolicy::allow_all());
        let resolver = Arc::new(OnDemandResolver::new(policy));

        let cert = make_certified_key("known.local");
        resolver.register("known.local", cert);

        let tls_config = build_tls_server_config(resolver);
        let app = Router::new().route("/", get(|| async { "hello" }));

        let addr = serve_https(
            "127.0.0.1:0".parse().unwrap(),
            app,
            tls_config,
        )
        .await
        .unwrap();

        let client_config = make_client_config();
        let connector = tokio_rustls::TlsConnector::from(Arc::new(client_config));

        let stream = tokio::net::TcpStream::connect(addr).await.unwrap();
        let server_name = ServerName::try_from("unknown.local").unwrap();
        let result = connector.connect(server_name, stream).await;
        assert!(result.is_err(), "TLS handshake should fail for unknown host");
    }
}
