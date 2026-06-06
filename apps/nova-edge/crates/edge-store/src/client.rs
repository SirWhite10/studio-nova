//! SurrealDB connection pool
//! TODO: implement connection, namespace/db selection

use anyhow::Result;
use surrealdb::Surreal;
use surrealdb::engine::remote::ws::Client;
use surrealdb::opt::auth::Root;

pub struct SurrealClient {
    pub db: Surreal<Client>,
}

impl SurrealClient {
    pub async fn connect(
        url: &str,
        namespace: &str,
        database: &str,
        username: &str,
        password: &str,
    ) -> Result<Self> {
        let endpoint = normalize_ws_endpoint(url);
        let db = if should_use_secure_ws(url) {
            Surreal::new::<surrealdb::engine::remote::ws::Wss>(endpoint.as_str()).await?
        } else {
            Surreal::new::<surrealdb::engine::remote::ws::Ws>(endpoint.as_str()).await?
        };
        db.signin(Root {
            username: username.to_string(),
            password: password.to_string(),
        })
        .await?;
        db.use_ns(namespace).use_db(database).await?;
        Ok(Self { db })
    }
}

fn should_use_secure_ws(url: &str) -> bool {
    let lower = url.to_ascii_lowercase();
    lower.starts_with("wss://") || lower.starts_with("https://") || lower.ends_with(":443")
}

fn normalize_ws_endpoint(url: &str) -> String {
    let trimmed = url.trim();
    let without_scheme = trimmed
        .strip_prefix("wss://")
        .or_else(|| trimmed.strip_prefix("ws://"))
        .or_else(|| trimmed.strip_prefix("https://"))
        .or_else(|| trimmed.strip_prefix("http://"))
        .unwrap_or(trimmed);

    without_scheme
        .strip_suffix("/rpc")
        .unwrap_or(without_scheme)
        .trim_end_matches('/')
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_surrealdb_websocket_urls_for_sdk_endpoint() {
        assert_eq!(
            normalize_ws_endpoint("wss://surrealdb.dlxstudios.com/rpc"),
            "surrealdb.dlxstudios.com"
        );
        assert_eq!(
            normalize_ws_endpoint("https://surrealdb.dlxstudios.com/"),
            "surrealdb.dlxstudios.com"
        );
        assert_eq!(
            normalize_ws_endpoint("ws://127.0.0.1:8000"),
            "127.0.0.1:8000"
        );
        assert_eq!(normalize_ws_endpoint("127.0.0.1:8000"), "127.0.0.1:8000");
    }

    #[test]
    fn chooses_secure_ws_for_tls_endpoints() {
        assert!(should_use_secure_ws("wss://surrealdb.dlxstudios.com/rpc"));
        assert!(should_use_secure_ws("https://surrealdb.dlxstudios.com"));
        assert!(should_use_secure_ws("surrealdb.dlxstudios.com:443"));
        assert!(!should_use_secure_ws("ws://127.0.0.1:8000"));
    }
}
