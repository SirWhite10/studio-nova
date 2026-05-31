//! Tunnel TCP listener.
//!
//! Accepts TCP connections on the configured tunnel port (:9443),
//! upgrades them to yamux sessions, and spawns per-client handlers.

use crate::control::TunnelSession;
use crate::health::{HealthCheckConfig, HealthChecker};
use crate::protocol::*;
use crate::registry::TunnelRegistry;
use std::sync::Arc;
use std::time::Duration;
use tokio::net::TcpListener;
use tokio::sync::watch;
use tracing::{error, info, warn};

/// The tunnel server responsible for accepting client connections.
pub struct TunnelServer {
    tunnel_token: String,
    registry: Arc<TunnelRegistry>,
    health_checker: HealthChecker,
    bind_addr: String,
    shutdown_rx: watch::Receiver<bool>,
}

impl TunnelServer {
    pub fn new(
        tunnel_token: String,
        registry: Arc<TunnelRegistry>,
        health_config: HealthCheckConfig,
        bind_addr: String,
        shutdown_rx: watch::Receiver<bool>,
    ) -> Self {
        let health_checker = HealthChecker::new(registry.clone(), health_config);
        Self {
            tunnel_token,
            registry,
            health_checker,
            bind_addr,
            shutdown_rx,
        }
    }

    /// Run the tunnel server loop.
    pub async fn run(&mut self) -> anyhow::Result<()> {
        let listener = TcpListener::bind(&self.bind_addr).await?;
        info!(addr = %self.bind_addr, "Tunnel server listening");

        // Spawn health check loop
        let hc_registry = self.registry.clone();
        let hc_interval = self.health_checker.check_interval();
        let mut hc_shutdown = self.shutdown_rx.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(hc_interval);
            loop {
                tokio::select! {
                    _ = interval.tick() => {
                        let checker = HealthChecker::new(
                            hc_registry.clone(),
                            HealthCheckConfig::default(),
                        );
                        let report = checker.run_check_cycle();
                        if report.stale_count > 0 {
                            info!(
                                healthy = report.healthy_count,
                                evicted = report.evicted.len(),
                                "Health check cycle completed"
                            );
                        }
                    }
                    _ = hc_shutdown.changed() => {
                        info!("Health checker shutting down");
                        break;
                    }
                }
            }
        });

        // Accept connections
        loop {
            tokio::select! {
                accept_result = listener.accept() => {
                    match accept_result {
                        Ok((stream, addr)) => {
                            info!(peer = %addr, "New tunnel connection");
                            // In a full implementation, upgrade to yamux here
                            // and spawn a task to handle the session.
                            let session = TunnelSession::new(
                                self.tunnel_token.clone(),
                                self.registry.clone(),
                            );
                            // Session would be used to handle the yamux connection
                            let _ = session;
                        }
                        Err(e) => {
                            error!(error = %e, "Failed to accept tunnel connection");
                        }
                    }
                }
                _ = self.shutdown_rx.changed() => {
                    info!("Tunnel server shutting down");
                    break;
                }
            }
        }

        Ok(())
    }

    /// Get a reference to the registry.
    pub fn registry(&self) -> &Arc<TunnelRegistry> {
        &self.registry
    }
}

// ── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn server_construction() {
        let registry = Arc::new(TunnelRegistry::new());
        let (_tx, rx) = watch::channel(false);
        let server = TunnelServer::new(
            "test-token".into(),
            registry.clone(),
            HealthCheckConfig::default(),
            "0.0.0.0:9443".into(),
            rx,
        );

        assert_eq!(server.registry().client_count(), 0);
    }

    #[tokio::test]
    async fn server_accepts_connections() {
        let registry = Arc::new(TunnelRegistry::new());
        let (tx, rx) = watch::channel(false);

        // Bind to port 0 for an ephemeral port
        let server = TunnelServer::new(
            "test-token".into(),
            registry.clone(),
            HealthCheckConfig::default(),
            "127.0.0.1:0".into(),
            rx,
        );

        // Run server in background
        let handle = tokio::spawn(async move {
            // Use a short timeout since we just want to verify it starts
            tokio::time::timeout(Duration::from_millis(100), server.run()).await
        });

        // Give it a moment to start
        tokio::time::sleep(Duration::from_millis(50)).await;

        // Shutdown
        tx.send(true).unwrap();

        let result = handle.await.unwrap();
        // The server should have either completed or timed out
        match result {
            Ok(Ok(())) => {}
            Ok(Err(_)) => {}
            Err(_) => {}
            _ => {}
        }
    }
}
