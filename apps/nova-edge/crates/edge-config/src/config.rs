use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct Config {
    // Bootstrap (required)
    pub hostname: String,
    pub admin_token: String,
    pub control_token: Option<String>,
    pub horizon_node_id: Option<String>,
    pub tunnel_token: String,
    pub surreal_url: String,
    pub subdomain_host: String,

    // SurrealDB
    pub surreal_namespace: String,
    pub surreal_database: String,
    pub surreal_username: String,
    pub surreal_password: String,

    // Ports
    pub api_port: u16,
    pub api_bind: String,
    pub tunnel_port: u16,
    pub tls_port: u16,
    pub http_port: u16,

    // TLS
    pub tls_email: Option<String>,
    pub tls_cache_dir: PathBuf,
    pub acme_directory: String,
    pub acme_cache_dir: PathBuf,
    pub acme_webroot_dir: PathBuf,
    pub acme_command: String,
    pub tls_self_signed_fallback: bool,

    // ClickHouse
    pub clickhouse_url: Option<String>,
    pub clickhouse_database: String,

    // Domain
    pub verification_prefix: String,

    // Logging
    pub log_level: String,

    // Webhooks
    pub webhook_url: Option<String>,
    pub webhook_secret: Option<String>,

    // OpenTelemetry
    pub otel_endpoint: Option<String>,
    pub otel_service_name: String,

    // Multi-VPS
    pub instance_id: Option<String>,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            hostname: env_required("NOVA_EDGE_HOSTNAME")?,
            admin_token: env_required("NOVA_EDGE_ADMIN_TOKEN")?,
            control_token: std::env::var("NOVA_EDGE_CONTROL_TOKEN").ok(),
            horizon_node_id: std::env::var("NOVA_EDGE_HORIZON_NODE_ID").ok(),
            tunnel_token: env_required("NOVA_EDGE_TUNNEL_TOKEN")?,
            surreal_url: env_required("NOVA_EDGE_SURREAL_URL")?,
            subdomain_host: env_required("NOVA_EDGE_SUBDOMAIN_HOST")?,

            surreal_namespace: env_or("NOVA_EDGE_SURREAL_NAMESPACE", "main"),
            surreal_database: env_or("NOVA_EDGE_SURREAL_DATABASE", "main"),
            surreal_username: env_or("NOVA_EDGE_SURREAL_USERNAME", "root"),
            surreal_password: env_or("NOVA_EDGE_SURREAL_PASSWORD", "root"),

            api_port: env_or_parse("NOVA_EDGE_API_PORT", 8790)?,
            api_bind: env_or("NOVA_EDGE_API_BIND", "127.0.0.1"),
            tunnel_port: env_or_parse("NOVA_EDGE_TUNNEL_PORT", 9443)?,
            tls_port: env_or_parse("NOVA_EDGE_TLS_PORT", 443)?,
            http_port: env_or_parse("NOVA_EDGE_HTTP_PORT", 80)?,

            tls_email: std::env::var("NOVA_EDGE_TLS_EMAIL").ok(),
            tls_cache_dir: PathBuf::from(env_or(
                "NOVA_EDGE_TLS_CACHE_DIR",
                "/var/lib/nova-edge/certs",
            )),
            acme_directory: env_or(
                "NOVA_EDGE_ACME_DIRECTORY",
                "https://acme-v02.api.letsencrypt.org/directory",
            ),
            acme_cache_dir: PathBuf::from(env_or(
                "NOVA_EDGE_ACME_CACHE_DIR",
                "/var/lib/nova-edge/certs/acme",
            )),
            acme_webroot_dir: PathBuf::from(env_or(
                "NOVA_EDGE_ACME_WEBROOT_DIR",
                "/var/lib/nova-edge/acme-webroot",
            )),
            acme_command: env_or("NOVA_EDGE_ACME_COMMAND", "lego"),
            tls_self_signed_fallback: env_or_parse("NOVA_EDGE_TLS_SELF_SIGNED_FALLBACK", false)?,

            clickhouse_url: std::env::var("NOVA_EDGE_CLICKHOUSE_URL").ok(),
            clickhouse_database: env_or("NOVA_EDGE_CLICKHOUSE_DATABASE", "nova_analytics"),

            verification_prefix: env_or("NOVA_EDGE_VERIFICATION_PREFIX", "_nova-domain"),
            log_level: env_or("NOVA_EDGE_LOG_LEVEL", "info"),

            webhook_url: std::env::var("NOVA_EDGE_WEBHOOK_URL").ok(),
            webhook_secret: std::env::var("NOVA_EDGE_WEBHOOK_SECRET").ok(),

            otel_endpoint: std::env::var("NOVA_EDGE_OTEL_ENDPOINT").ok(),
            otel_service_name: env_or("NOVA_EDGE_OTEL_SERVICE_NAME", "nova-edge"),

            instance_id: std::env::var("NOVA_EDGE_INSTANCE_ID").ok(),
        })
    }
}

fn env_required(key: &str) -> anyhow::Result<String> {
    std::env::var(key).map_err(|_| anyhow::anyhow!("Required env var {} not set", key))
}

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}

fn env_or_parse<T: std::str::FromStr>(key: &str, default: T) -> anyhow::Result<T> {
    match std::env::var(key) {
        Ok(val) => val
            .parse()
            .map_err(|_| anyhow::anyhow!("Cannot parse env var {}", key)),
        Err(_) => Ok(default),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_from_env_requires_hostname() {
        // Clear relevant env vars
        unsafe { std::env::remove_var("NOVA_EDGE_HOSTNAME") };
        let result = Config::from_env();
        assert!(result.is_err());
    }
}
