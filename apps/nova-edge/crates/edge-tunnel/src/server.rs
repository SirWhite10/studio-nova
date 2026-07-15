//! Tunnel TCP listener and yamux session driver.
//!
//! This is Nova Edge's native Rust FRP-style tunnel server. Clients connect to
//! `:9443`, open a yamux control stream, authenticate with `Login`, register
//! `NewProxy` routes, and then accept server-opened yamux data streams for
//! proxied HTTP requests.

use crate::health::{HealthCheckConfig, HealthChecker};
use crate::protocol::*;
use crate::proxy::{ProxyHandler, ProxyRegistrationResult};
use crate::registry::{TunnelClient, TunnelIdentity, TunnelRegistry};
use crate::transport::{TunnelConnector, YamuxCommand};
use edge_store::{DomainStore, live_cache::LiveCache};
use futures::future::poll_fn;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, oneshot, watch};
use tokio_util::compat::TokioAsyncReadCompatExt;
use tracing::{error, info, warn};
use yamux::{Config as YamuxConfig, Connection, Mode, Stream};

/// The tunnel server responsible for accepting client connections.
pub struct TunnelServer {
    tunnel_token: String,
    registry: Arc<TunnelRegistry>,
    live_cache: Arc<LiveCache>,
    store: Arc<dyn DomainStore>,
    horizon_node_id: Option<String>,
    health_checker: HealthChecker,
    bind_addr: String,
    shutdown_rx: watch::Receiver<bool>,
    request_timeout: Duration,
}

impl TunnelServer {
    pub fn new(
        tunnel_token: String,
        registry: Arc<TunnelRegistry>,
        live_cache: Arc<LiveCache>,
        store: Arc<dyn DomainStore>,
        horizon_node_id: Option<String>,
        health_config: HealthCheckConfig,
        bind_addr: String,
        shutdown_rx: watch::Receiver<bool>,
    ) -> Self {
        let health_checker = HealthChecker::new(registry.clone(), health_config);
        Self {
            tunnel_token,
            registry,
            live_cache,
            store,
            horizon_node_id,
            health_checker,
            bind_addr,
            shutdown_rx,
            request_timeout: Duration::from_secs(30),
        }
    }

    /// Run the tunnel server loop.
    pub async fn run(&mut self) -> anyhow::Result<()> {
        let listener = TcpListener::bind(&self.bind_addr).await?;
        let bound = listener.local_addr()?;
        info!(addr = %bound, "Tunnel server listening");

        let hc_registry = self.registry.clone();
        let hc_interval = self.health_checker.check_interval();
        let mut hc_shutdown = self.shutdown_rx.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(hc_interval);
            loop {
                tokio::select! {
                    _ = interval.tick() => {
                        let checker = HealthChecker::new(hc_registry.clone(), HealthCheckConfig::default());
                        let report = checker.run_check_cycle();
                        if report.stale_count > 0 {
                            info!(healthy = report.healthy_count, evicted = report.evicted.len(), "Health check cycle completed");
                        }
                    }
                    _ = hc_shutdown.changed() => {
                        info!("Health checker shutting down");
                        break;
                    }
                }
            }
        });

        loop {
            tokio::select! {
                accept_result = listener.accept() => {
                    match accept_result {
                        Ok((stream, addr)) => {
                            info!(peer = %addr, "New tunnel connection");
                            let registry = self.registry.clone();
                            let live_cache = self.live_cache.clone();
                            let store = self.store.clone();
                            let horizon_node_id = self.horizon_node_id.clone();
                            let token = self.tunnel_token.clone();
                            let timeout = self.request_timeout;
                            tokio::spawn(async move {
                                if let Err(e) = handle_tunnel_connection(stream, addr, token, registry, live_cache, store, horizon_node_id, timeout).await {
                                    warn!(peer = %addr, error = %e, "Tunnel connection ended");
                                }
                            });
                        }
                        Err(e) => error!(error = %e, "Failed to accept tunnel connection"),
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

    pub fn registry(&self) -> &Arc<TunnelRegistry> {
        &self.registry
    }
}

async fn handle_tunnel_connection(
    stream: TcpStream,
    peer: SocketAddr,
    tunnel_token: String,
    registry: Arc<TunnelRegistry>,
    live_cache: Arc<LiveCache>,
    store: Arc<dyn DomainStore>,
    horizon_node_id: Option<String>,
    request_timeout: Duration,
) -> anyhow::Result<()> {
    let conn = Connection::new(stream.compat(), YamuxConfig::default(), Mode::Server);
    let (cmd_tx, cmd_rx) = mpsc::channel::<YamuxCommand>(32);
    let (inbound_tx, mut inbound_rx) = mpsc::channel::<Stream>(32);
    let (driver_done_tx, mut driver_done_rx) = oneshot::channel::<()>();
    tokio::spawn(async move {
        run_yamux_driver(conn, cmd_rx, inbound_tx).await;
        let _ = driver_done_tx.send(());
    });

    let mut control = match inbound_rx.recv().await {
        Some(stream) => stream,
        None => anyhow::bail!("client closed before opening control stream"),
    };

    let login_env = read_envelope_futures(&mut control).await?;
    if login_env.msg_type != "Login" {
        write_message_futures(&mut control, &GeneralResponse::error(1, "expected Login")).await?;
        anyhow::bail!(
            "first control message was {}, expected Login",
            login_env.msg_type
        );
    }
    let login: Login = login_env.decode()?;
    if login.token != tunnel_token {
        write_message_futures(&mut control, &GeneralResponse::error(1, "invalid token")).await?;
        anyhow::bail!("invalid tunnel token for run_id={}", login.run_id);
    }
    let identity = match TunnelIdentity::from_login(&login) {
        Ok(identity) => identity,
        Err(reason) => {
            write_message_futures(&mut control, &GeneralResponse::error(1, reason)).await?;
            anyhow::bail!(
                "invalid native tunnel identity for run_id={}: {reason}",
                login.run_id
            );
        }
    };
    if let Some(native_identity) = identity.as_ref() {
        let Some(horizon_node_id) = horizon_node_id.as_deref() else {
            write_message_futures(
                &mut control,
                &GeneralResponse::error(1, "native tunnel identity is disabled on this Horizon"),
            )
            .await?;
            anyhow::bail!("native tunnel identity supplied but NOVA_EDGE_HORIZON_NODE_ID is unset");
        };
        let authorized = store
            .validate_tunnel_connector_identity(
                &native_identity.constellation_id,
                &native_identity.habitat_node_id,
                horizon_node_id,
                &native_identity.connector_key,
            )
            .await?;
        if !authorized {
            write_message_futures(
                &mut control,
                &GeneralResponse::error(1, "native tunnel connector identity is not authorized"),
            )
            .await?;
            anyhow::bail!(
                "unauthorized native tunnel connector identity for run_id={}",
                login.run_id
            );
        }
    }

    let run_id = login.run_id.clone();
    let connector = TunnelConnector::new(run_id.clone(), cmd_tx, request_timeout);
    registry.register(TunnelClient {
        run_id: run_id.clone(),
        proxy_names: Vec::new(),
        connector: Some(connector),
        identity,
        registered_at: Instant::now(),
        last_seen: Instant::now(),
    });
    write_message_futures(&mut control, &GeneralResponse::ok()).await?;
    info!(peer = %peer, run_id = %run_id, hostname = %login.hostname, "Tunnel client logged in");

    let (done_tx, mut done_rx) = watch::channel(false);
    let registry_for_control = registry.clone();
    let live_cache_for_control = live_cache.clone();
    let run_id_for_control = run_id.clone();
    tokio::spawn(async move {
        let proxy_handler = ProxyHandler::new(live_cache_for_control, registry_for_control.clone());
        loop {
            let env = match read_envelope_futures(&mut control).await {
                Ok(env) => env,
                Err(e) => {
                    warn!(run_id = %run_id_for_control, error = %e, "control stream closed");
                    break;
                }
            };
            match env.msg_type.as_str() {
                "NewProxy" => {
                    let msg: NewProxy = match env.decode() {
                        Ok(m) => m,
                        Err(e) => {
                            let _ = write_message_futures(
                                &mut control,
                                &GeneralResponse::error(3, e.to_string()),
                            )
                            .await;
                            continue;
                        }
                    };
                    let result = proxy_handler.handle_new_proxy(msg.clone(), &run_id_for_control);
                    if matches!(result, ProxyRegistrationResult::Registered { .. }) {
                        registry_for_control
                            .register_proxy_for_client(&run_id_for_control, &msg.proxy_name);
                    }
                    let _ = write_message_futures(
                        &mut control,
                        &ProxyHandler::registration_response(&result),
                    )
                    .await;
                }
                "Heartbeat" => {
                    registry_for_control.touch(&run_id_for_control);
                    let _ = write_message_futures(&mut control, &GeneralResponse::ok()).await;
                }
                "CloseProxy" => {
                    if let Ok(msg) = env.decode::<CloseProxy>() {
                        registry_for_control
                            .unregister_proxy_for_client(&run_id_for_control, &msg.proxy_name);
                    }
                    let _ = write_message_futures(&mut control, &GeneralResponse::ok()).await;
                }
                other => {
                    let _ = write_message_futures(
                        &mut control,
                        &GeneralResponse::error(9, format!("unsupported message: {other}")),
                    )
                    .await;
                }
            }
        }
        let _ = done_tx.send(true);
    });

    tokio::select! {
        _ = done_rx.changed() => {}
        _ = &mut driver_done_rx => {}
    }
    registry.unregister(&run_id);
    info!(run_id = %run_id, "Tunnel client disconnected");
    Ok(())
}

async fn run_yamux_driver(
    mut conn: Connection<tokio_util::compat::Compat<TcpStream>>,
    mut rx: mpsc::Receiver<YamuxCommand>,
    inbound_tx: mpsc::Sender<Stream>,
) {
    loop {
        tokio::select! {
            cmd = rx.recv() => {
                match cmd {
                    Some(YamuxCommand::OpenOutbound { reply }) => {
                        let stream = poll_fn(|cx| conn.poll_new_outbound(cx)).await;
                        let _ = reply.send(stream);
                    }
                    None => {
                        let _ = poll_fn(|cx| conn.poll_close(cx)).await;
                        break;
                    }
                }
            }
            inbound = poll_fn(|cx| conn.poll_next_inbound(cx)) => {
                match inbound {
                    Some(Ok(stream)) => {
                        if inbound_tx.send(stream).await.is_err() {
                            break;
                        }
                    }
                    Some(Err(e)) => {
                        warn!(error = %e, "yamux connection error");
                        break;
                    }
                    None => break,
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn server_construction() {
        use edge_store::{DomainStore, memory_store::MemoryStore};
        let registry = Arc::new(TunnelRegistry::new());
        let live_cache = Arc::new(LiveCache::new());
        let (_tx, rx) = watch::channel(false);
        let server = TunnelServer::new(
            "test-token".into(),
            registry.clone(),
            live_cache,
            Arc::new(MemoryStore::new()) as Arc<dyn DomainStore>,
            Some("infrastructure_node:horizon-test".into()),
            HealthCheckConfig::default(),
            "127.0.0.1:0".into(),
            rx,
        );

        assert_eq!(server.registry().client_count(), 0);
    }
}
