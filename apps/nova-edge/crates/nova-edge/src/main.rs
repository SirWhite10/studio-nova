use anyhow::Result;
use tracing::info;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .json()
        .init();

    info!("nova-edge starting");

    // TODO: Load config from env (edge-config)
    // TODO: Connect to SurrealDB, ensure schema (edge-store)
    // TODO: Start live cache (edge-store)
    // TODO: Start admin API server on :8790 (edge-api)
    // TODO: Start tunnel server on :9443 (edge-tunnel)
    // TODO: Start HTTPS edge on :443 + HTTP redirect on :80 (edge-tls)
    // TODO: Start ClickHouse logging (edge-analytics)
    // TODO: Start OpenTelemetry (edge-analytics)
    // TODO: Graceful shutdown on SIGTERM/SIGINT

    info!("nova-edge initialized — all services started");

    // Placeholder: wait for shutdown signal
    tokio::signal::ctrl_c().await?;
    info!("nova-edge shutting down");

    Ok(())
}
