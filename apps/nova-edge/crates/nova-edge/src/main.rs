//! Nova Edge — unified Rust edge service.
//!
//! Single binary handling TLS termination, admin API, FRP-compatible tunnel
//! server, analytics, and observability. Wires all workspace crates together.

use std::net::SocketAddr;
use std::sync::Arc;

use anyhow::{Context, Result};
use tracing::info;

use edge_api::server;
use edge_api::verification::HickoryDnsResolver;
use edge_config::config::Config;
use edge_store::live_cache::LiveCache;
use edge_store::memory_store::MemoryStore;
use edge_store::surreal_store::SurrealStore;
use edge_store::DomainStore;
use edge_tls::certs::CertStorage;
use edge_tls::on_demand::{LiveCacheHostPolicy, OnDemandResolver};
use edge_tls::redirect::{http_redirect_router, HttpRedirectState};
use edge_tls::server::{build_tls_server_config, serve_https};

// ── Entry point ──────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<()> {
    // ── 1. Tracing ────────────────────────────────────────────────
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .json()
        .init();

    info!("nova-edge starting");

    // ── 2. Config ─────────────────────────────────────────────────
    let config = Config::from_env().context("failed to load config from env")?;
    info!(
        hostname = %config.hostname,
        api_port = config.api_port,
        tls_port = config.tls_port,
        http_port = config.http_port,
        tunnel_port = config.tunnel_port,
        "config loaded"
    );

    // ── 3. CryptoProvider (required by rustls 0.23+) ──────────────
    rustls::crypto::ring::default_provider()
        .install_default()
        .map_err(|_| anyhow::anyhow!("failed to install rustls CryptoProvider"))?;
    info!("rustls CryptoProvider installed");

    // ── 4. SurrealDB + LiveCache ──────────────────────────────────
    let store: Arc<dyn DomainStore> = match connect_and_init_store(&config).await {
        Ok((surreal_store, live_cache)) => {
            let host_count: usize = live_cache.host_count();
            let proxy_count: usize = live_cache.proxy_count();
            info!(
                hosts = host_count,
                proxies = proxy_count,
                "SurrealDB connected, live cache started"
            );
            Arc::new(surreal_store)
        }
        Err(e) => {
            tracing::warn!(
                error = %e,
                "SurrealDB unavailable — falling back to in-memory store"
            );
            Arc::new(MemoryStore::new()) as Arc<dyn DomainStore>
        }
    };

    let live_cache = Arc::new(LiveCache::new());

    // ── 5. Admin API router ───────────────────────────────────────
    let dns_resolver = Arc::new(
        HickoryDnsResolver::new().context("failed to create DNS resolver")?,
    );
    let admin_tokens = parse_admin_tokens(&config.tunnel_token);

    let admin_router = server::create_router(
        store.clone(),
        config.admin_token.clone(),
        admin_tokens,
        dns_resolver,
    );
    info!("admin API router built");

    // ── 6. TLS setup ──────────────────────────────────────────────
    let cert_storage = CertStorage::new(&config.tls_cache_dir);
    let host_policy = Arc::new(LiveCacheHostPolicy::new(live_cache.clone()));
    let resolver = Arc::new(OnDemandResolver::new(host_policy));

    // Pre-load any cached certs into the resolver
    match cert_storage.list_domains() {
        Ok(domains) => {
            for domain in &domains {
                if let Ok(Some(cert)) = cert_storage.load_cert(domain) {
                    resolver.register(domain, cert);
                }
            }
            info!(count = domains.len(), "pre-loaded cached TLS certs");
        }
        Err(e) => {
            tracing::warn!(error = %e, "failed to list cached certs");
        }
    }

    let tls_config = build_tls_server_config(resolver.clone());
    info!("TLS server config built");

    // ── 7. Addresses ──────────────────────────────────────────────
    let https_addr: SocketAddr = format!("0.0.0.0:{}", config.tls_port)
        .parse()
        .context("invalid TLS port")?;
    let http_addr: SocketAddr = format!("0.0.0.0:{}", config.http_port)
        .parse()
        .context("invalid HTTP port")?;
    let api_addr: SocketAddr = format!("0.0.0.0:{}", config.api_port)
        .parse()
        .context("invalid API port")?;
    let tunnel_addr: SocketAddr = format!("0.0.0.0:{}", config.tunnel_port)
        .parse()
        .context("invalid tunnel port")?;

    // ── 8. HTTP redirect server (port 80) ─────────────────────────
    let redirect_state = Arc::new(HttpRedirectState::new(config.tls_port));
    let redirect_router = http_redirect_router(redirect_state.clone());

    let http_listener = tokio::net::TcpListener::bind(http_addr)
        .await
        .context("failed to bind HTTP redirect port")?;
    let http_bound = http_listener.local_addr()?;
    info!(addr = %http_bound, "HTTP redirect listener bound");

    let http_server = axum::serve(http_listener, redirect_router);

    // ── 9. HTTPS edge server (port 443) ───────────────────────────
    let https_bound = serve_https(https_addr, admin_router.clone(), tls_config)
        .await
        .context("failed to start HTTPS server")?;
    info!(addr = %https_bound, "HTTPS edge server started");

    // ── 10. Admin API server (port 8790) ──────────────────────────
    let api_listener = tokio::net::TcpListener::bind(api_addr)
        .await
        .context("failed to bind admin API port")?;
    let api_bound = api_listener.local_addr()?;
    info!(addr = %api_bound, "admin API listener bound");

    let api_server = axum::serve(api_listener, admin_router);

    // ── 11. Tunnel server (placeholder) ───────────────────────────
    info!(addr = %tunnel_addr, "tunnel server placeholder (not yet implemented)");

    // ── 12. Graceful shutdown ─────────────────────────────────────
    let shutdown = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install ctrl+c handler");
        info!("received SIGINT (ctrl+c)");
    };

    #[cfg(unix)]
    let shutdown = async {
        let mut sigterm = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler");
        tokio::select! {
            _ = tokio::signal::ctrl_c() => {
                info!("received SIGINT (ctrl+c)");
            }
            _ = sigterm.recv() => {
                info!("received SIGTERM");
            }
        }
    };

    info!("nova-edge initialized — all services started");

    // ── 13. Run all servers concurrently ──────────────────────────
    tokio::select! {
        r = http_server => {
            info!("HTTP redirect server exited");
            r.context("HTTP redirect server error")?;
        }
        r = api_server => {
            info!("admin API server exited");
            r.context("admin API server error")?;
        }
        _ = shutdown => {
            info!("shutdown signal received, stopping");
        }
    }

    info!("nova-edge shutting down");
    Ok(())
}

// ── Helpers ──────────────────────────────────────────────────────────

/// Connect to SurrealDB, ensure schema, start live cache, return the store.
async fn connect_and_init_store(
    config: &Config,
) -> Result<(SurrealStore<surrealdb::engine::remote::ws::Client>, Arc<LiveCache>)> {
    use edge_store::store_config::StoreSchemaConfig;

    let client = edge_store::client::SurrealClient::connect(
        &config.surreal_url,
        &config.surreal_namespace,
        &config.surreal_database,
    )
    .await
    .context("failed to connect to SurrealDB")?;

    let schema = StoreSchemaConfig::studio();
    let store = SurrealStore::new(client.db.clone(), schema);

    // Ensure schema is applied
    store
        .ensure_schema()
        .await
        .context("failed to ensure SurrealDB schema")?;

    // Start live cache
    let live_cache = Arc::new(
        LiveCache::start(&client.db)
            .await
            .context("failed to start live cache")?,
    );

    Ok((store, live_cache))
}

/// Parse additional admin tokens from the tunnel token field.
/// The tunnel_token is accepted as a secondary auth token for FRP compatibility.
fn parse_admin_tokens(tunnel_token: &str) -> Vec<String> {
    if tunnel_token.is_empty() {
        Vec::new()
    } else {
        vec![tunnel_token.to_string()]
    }
}

// ── Integration tests (T41) ──────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use edge_api::server as api_server;
    use edge_store::memory_store::MemoryStore;
    use edge_tls::certs::CertStorage;
    use edge_tls::on_demand::{OnDemandResolver, StaticHostPolicy};

    /// A simple mock DNS resolver for integration tests.
    /// (edge-api's MockDnsResolver is #[cfg(test)]-gated and not visible externally)
    struct LocalMockDnsResolver;

    impl LocalMockDnsResolver {
        fn new() -> Self { Self }
    }

    #[async_trait::async_trait]
    impl edge_api::verification::DnsResolver for LocalMockDnsResolver {
        async fn lookup_txt(&self, _name: &str) -> anyhow::Result<Vec<String>> {
            Ok(vec![])
        }
    }

    /// Test: Config::from_env() fails gracefully when required vars are missing.
    #[test]
    fn test_config_requires_env_vars() {
        // Clear required vars to ensure predictable state
        for key in &[
            "NOVA_EDGE_HOSTNAME",
            "NOVA_EDGE_ADMIN_TOKEN",
            "NOVA_EDGE_TUNNEL_TOKEN",
            "NOVA_EDGE_SURREAL_URL",
            "NOVA_EDGE_SUBDOMAIN_HOST",
        ] {
            unsafe { std::env::remove_var(key) };
        }
        let result = Config::from_env();
        assert!(result.is_err(), "Config::from_env should fail without required vars");
    }

    /// Test: Admin API router can be built with a memory store.
    #[test]
    fn test_admin_router_builds() {
        let store: Arc<dyn DomainStore> = Arc::new(MemoryStore::new());
        let dns_resolver = Arc::new(LocalMockDnsResolver::new());
        let router = api_server::create_router(
            store,
            "test-token".to_string(),
            vec![],
            dns_resolver,
        );
        // Router builds without panicking — sufficient for wiring test
        drop(router);
    }

    /// Test: TLS server config builds with OnDemandResolver.
    #[test]
    fn test_tls_config_builds() {
        let _ = rustls::crypto::ring::default_provider().install_default();
        let policy = Arc::new(StaticHostPolicy::allow_all());
        let resolver = Arc::new(OnDemandResolver::new(policy));
        let config = build_tls_server_config(resolver);
        assert!(config.alpn_protocols.contains(&b"h2".to_vec()));
        assert!(config.alpn_protocols.contains(&b"http/1.1".to_vec()));
    }

    /// Test: CertStorage generates and loads self-signed certs.
    #[test]
    fn test_cert_storage_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let storage = CertStorage::new(dir.path());

        let (cert_pem, key_pem) = CertStorage::generate_self_signed("test.local").unwrap();
        storage.store_cert("test.local", &cert_pem, &key_pem).unwrap();
        let loaded = storage.load_cert("test.local").unwrap().unwrap();
        assert_eq!(loaded.cert.len(), 1);
    }

    /// Test: HTTP redirect router builds without panic.
    #[test]
    fn test_redirect_router_builds() {
        let state = Arc::new(HttpRedirectState::new(443));
        let _router = http_redirect_router(state);
    }

    /// Test: parse_admin_tokens handles empty string.
    #[test]
    fn test_parse_admin_tokens_empty() {
        assert!(parse_admin_tokens("").is_empty());
    }

    /// Test: parse_admin_tokens returns the tunnel token.
    #[test]
    fn test_parse_admin_tokens_present() {
        let tokens = parse_admin_tokens("my-tunnel-token");
        assert_eq!(tokens, vec!["my-tunnel-token".to_string()]);
    }

    /// Test: LiveCache::new() creates empty cache.
    #[test]
    fn test_live_cache_new() {
        let cache = LiveCache::new();
        assert_eq!(cache.host_count(), 0);
        assert_eq!(cache.proxy_count(), 0);
    }
}
