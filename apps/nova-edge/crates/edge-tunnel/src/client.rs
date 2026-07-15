//! Native Nova Edge tunnel client.
//!
//! Connects to the Nova Edge tunnel server, registers one or more local HTTP
//! services, and serves server-opened yamux data streams by proxying them to
//! local TCP backends.

use crate::protocol::{
    GeneralResponse, Login, NewProxy, read_envelope_futures, write_message_futures,
};
use crate::registry::TunnelIdentity;
use crate::transport::YamuxCommand;
use crate::transport::read_data_stream_start;
use futures::future::poll_fn;
use futures::io::{AsyncReadExt as FuturesAsyncReadExt, AsyncWriteExt as FuturesAsyncWriteExt};
use std::net::SocketAddr;
use std::time::Duration;
use tokio::io::{AsyncReadExt as TokioAsyncReadExt, AsyncWriteExt as TokioAsyncWriteExt};
use tokio::net::TcpStream;
use tokio::sync::{mpsc, oneshot, watch};
use tokio_util::compat::{FuturesAsyncReadCompatExt, TokioAsyncReadCompatExt};
use tracing::{info, warn};
use yamux::{Config as YamuxConfig, Connection, Mode, Stream};

#[derive(Debug, Clone)]
pub struct ClientProxyConfig {
    pub proxy_name: String,
    pub proxy_type: String,
    pub local_addr: SocketAddr,
}

#[derive(Debug, Clone)]
pub struct TunnelClientConfig {
    pub server_addr: String,
    pub token: String,
    pub run_id: String,
    pub hostname: String,
    pub identity: Option<TunnelIdentity>,
    pub proxies: Vec<ClientProxyConfig>,
    pub heartbeat_interval: Duration,
    pub reconnect_interval: Duration,
}

pub struct TunnelClientRunner {
    config: TunnelClientConfig,
}

impl TunnelClientRunner {
    pub fn new(config: TunnelClientConfig) -> Self {
        Self { config }
    }

    pub async fn run_until_shutdown(
        self,
        mut shutdown_rx: watch::Receiver<bool>,
    ) -> anyhow::Result<()> {
        loop {
            tokio::select! {
                result = run_once(self.config.clone()) => {
                    if let Err(e) = result {
                        warn!(error = %e, "tunnel client disconnected; reconnecting");
                    }
                    tokio::time::sleep(self.config.reconnect_interval).await;
                }
                _ = shutdown_rx.changed() => break,
            }
        }
        Ok(())
    }
}

async fn run_once(config: TunnelClientConfig) -> anyhow::Result<()> {
    let tcp = TcpStream::connect(&config.server_addr).await?;
    let conn = Connection::new(tcp.compat(), YamuxConfig::default(), Mode::Client);
    let (cmd_tx, cmd_rx) = mpsc::channel::<YamuxCommand>(32);
    let (inbound_tx, mut inbound_rx) = mpsc::channel::<Stream>(32);
    let (driver_done_tx, mut driver_done_rx) = oneshot::channel::<()>();
    tokio::spawn(async move {
        run_yamux_driver(conn, cmd_rx, inbound_tx).await;
        let _ = driver_done_tx.send(());
    });

    let mut control = open_outbound(&cmd_tx).await?;
    let login = Login {
        version: env!("CARGO_PKG_VERSION").to_string(),
        hostname: config.hostname.clone(),
        run_id: config.run_id.clone(),
        pool_count: 1,
        token: config.token.clone(),
        constellation_id: config
            .identity
            .as_ref()
            .map(|value| value.constellation_id.clone()),
        habitat_node_id: config
            .identity
            .as_ref()
            .map(|value| value.habitat_node_id.clone()),
        connector_key: config
            .identity
            .as_ref()
            .map(|value| value.connector_key.clone()),
    };
    write_message_futures(&mut control, &login).await?;
    expect_ok(&mut control).await?;

    for proxy in &config.proxies {
        let msg = NewProxy {
            proxy_name: proxy.proxy_name.clone(),
            proxy_type: proxy.proxy_type.clone(),
            use_encryption: false,
            use_compression: false,
            custom_domains: Vec::new(),
            locations: Vec::new(),
        };
        write_message_futures(&mut control, &msg).await?;
        expect_ok(&mut control).await?;
        info!(proxy = %proxy.proxy_name, local = %proxy.local_addr, "registered tunnel proxy");
    }

    let heartbeat_interval = config.heartbeat_interval;
    let run_id = config.run_id.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(heartbeat_interval);
        loop {
            interval.tick().await;
            let hb = crate::protocol::Heartbeat {
                timestamp: chrono::Utc::now().timestamp_millis(),
            };
            if write_message_futures(&mut control, &hb).await.is_err() {
                break;
            }
            let _ = read_envelope_futures(&mut control).await;
        }
        warn!(run_id = %run_id, "heartbeat loop stopped");
    });

    loop {
        tokio::select! {
            stream = inbound_rx.recv() => {
                let Some(mut stream) = stream else { anyhow::bail!("yamux connection closed"); };
                let proxies = config.proxies.clone();
                tokio::spawn(async move {
                    if let Err(e) = handle_data_stream(&mut stream, &proxies).await {
                        warn!(error = %e, "failed handling tunnel data stream");
                    }
                });
            }
            _ = &mut driver_done_rx => anyhow::bail!("yamux connection closed"),
        }
    }
}

async fn open_outbound(cmd_tx: &mpsc::Sender<YamuxCommand>) -> anyhow::Result<Stream> {
    let (reply, recv) = oneshot::channel();
    cmd_tx
        .send(YamuxCommand::OpenOutbound { reply })
        .await
        .map_err(|_| anyhow::anyhow!("yamux driver stopped"))?;
    recv.await
        .map_err(|_| anyhow::anyhow!("yamux driver dropped open reply"))?
        .map_err(Into::into)
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

async fn expect_ok(stream: &mut yamux::Stream) -> anyhow::Result<()> {
    let env = read_envelope_futures(stream).await?;
    let resp: GeneralResponse = env.decode()?;
    if !resp.is_ok() {
        anyhow::bail!("server rejected tunnel message: {}", resp.msg);
    }
    Ok(())
}

async fn handle_data_stream(
    stream: &mut yamux::Stream,
    proxies: &[ClientProxyConfig],
) -> anyhow::Result<()> {
    let start = read_data_stream_start(stream).await?;
    let proxy = proxies
        .iter()
        .find(|p| p.proxy_name == start.proxy_name)
        .ok_or_else(|| anyhow::anyhow!("unknown proxy on data stream: {}", start.proxy_name))?;

    let mut request = Vec::new();
    stream.read_to_end(&mut request).await?;

    let mut local = TcpStream::connect(proxy.local_addr).await?;
    local.write_all(&request).await?;
    local.shutdown().await?;

    let mut response = Vec::new();
    local.read_to_end(&mut response).await?;
    stream.write_all(&response).await?;
    stream.close().await?;
    Ok(())
}
