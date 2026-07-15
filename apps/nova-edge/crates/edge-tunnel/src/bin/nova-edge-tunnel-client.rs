use std::net::SocketAddr;
use std::time::Duration;

use edge_tunnel::client::{ClientProxyConfig, TunnelClientConfig, TunnelClientRunner};
use edge_tunnel::registry::TunnelIdentity;
use tokio::sync::watch;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let server_addr =
        std::env::var("NOVA_EDGE_TUNNEL_SERVER").unwrap_or_else(|_| "127.0.0.1:9443".to_string());
    let token = std::env::var("NOVA_EDGE_TUNNEL_TOKEN")?;
    let proxy_name = std::env::var("NOVA_EDGE_TUNNEL_PROXY")?;
    let local_addr: SocketAddr = std::env::var("NOVA_EDGE_TUNNEL_LOCAL_ADDR")?.parse()?;
    let run_id = std::env::var("NOVA_EDGE_TUNNEL_RUN_ID")
        .unwrap_or_else(|_| format!("nova-edge-client-{}", std::process::id()));
    let hostname = std::env::var("NOVA_EDGE_TUNNEL_HOSTNAME").unwrap_or_else(|_| "local".into());
    let identity = match (
        std::env::var("NOVA_EDGE_CONSTELLATION_ID").ok(),
        std::env::var("NOVA_EDGE_HABITAT_NODE_ID").ok(),
        std::env::var("NOVA_EDGE_CONNECTOR_KEY").ok(),
    ) {
        (None, None, None) => None,
        (Some(constellation_id), Some(habitat_node_id), Some(connector_key)) => {
            Some(TunnelIdentity {
                constellation_id,
                habitat_node_id,
                connector_key,
            })
        }
        _ => anyhow::bail!(
            "NOVA_EDGE_CONSTELLATION_ID, NOVA_EDGE_HABITAT_NODE_ID, and NOVA_EDGE_CONNECTOR_KEY must be set together"
        ),
    };

    let config = TunnelClientConfig {
        server_addr,
        token,
        run_id,
        hostname,
        identity,
        proxies: vec![ClientProxyConfig {
            proxy_name,
            proxy_type: "http".into(),
            local_addr,
        }],
        heartbeat_interval: Duration::from_secs(15),
        reconnect_interval: Duration::from_secs(3),
    };

    let (_tx, rx) = watch::channel(false);
    TunnelClientRunner::new(config).run_until_shutdown(rx).await
}
