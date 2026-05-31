use axum::{routing::{delete, get, post}, Router, middleware};
use edge_store::DomainStore;
use std::sync::Arc;

use crate::handlers;
use crate::middleware::auth::auth_middleware;

#[derive(Clone)]
pub struct AppState {
    pub store: Arc<dyn DomainStore>,
    pub admin_token: String,
    pub admin_tokens: Vec<String>,
    pub dns_resolver: Arc<dyn crate::verification::DnsResolver>,
}

pub fn create_router(
    store: Arc<dyn DomainStore>,
    admin_token: String,
    admin_tokens: Vec<String>,
    dns_resolver: Arc<dyn crate::verification::DnsResolver>,
) -> Router {
    let state = AppState {
        store: store.clone(),
        admin_token: admin_token.clone(),
        admin_tokens: admin_tokens.clone(),
        dns_resolver: dns_resolver.clone(),
    };

    Router::new()
        // Health + resolve (public)
        .route("/health", get(handlers::health::health))
        .route("/resolve", get(handlers::health::resolve))
        // FRP plugin handler
        .route("/frp/handler", post(handlers::frp::handle))
        // Admin API (authenticated)
        .nest("/admin", admin_routes(store, admin_token, admin_tokens, dns_resolver))
        .with_state(state)
}

fn admin_routes(
    store: Arc<dyn DomainStore>,
    admin_token: String,
    admin_tokens: Vec<String>,
    dns_resolver: Arc<dyn crate::verification::DnsResolver>,
) -> Router<AppState> {
    let state = AppState {
        store,
        admin_token,
        admin_tokens,
        dns_resolver,
    };

    Router::new()
        .route("/domains/verify", get(handlers::domains::check_verification))
        .route("/domains/verify", post(handlers::domains::verify))
        .route("/domains/{host}", delete(handlers::domains::remove))
        .route("/proxies", post(handlers::proxies::upsert))
        .route("/proxies/{name}/sync", post(handlers::proxies::sync))
        .route("/proxies/{name}/domains", get(handlers::proxies::list_domains))
        .route("/proxies/{name}", delete(handlers::proxies::disable))
        .route("/studios/{id}/domains", get(handlers::studios::list_domains))
        .layer(middleware::from_fn_with_state(state, auth_middleware))
}

// ── Integration Tests ─────────────────────────────────────────────

#[cfg(test)]
mod integration {
    use super::*;
    use axum::body::Body;
    use edge_store::memory_store::MemoryStore;
    use edge_store::types::*;
    use http::{Method, Request, StatusCode};
    use http_body_util::BodyExt;
    use serde_json::{json, Value};
    use tower::ServiceExt;

    fn test_app() -> Router {
        let store = Arc::new(MemoryStore::new()) as Arc<dyn DomainStore>;
        let dns_resolver = Arc::new(crate::verification::MockDnsResolver::new(vec![]));
        create_router(
            store,
            "admin-secret".to_string(),
            vec!["alt-secret".to_string()],
            dns_resolver,
        )
    }

    async fn send(app: Router, method: Method, uri: &str, body: Option<String>) -> (StatusCode, Value) {
        let mut builder = Request::builder().method(method).uri(uri);
        builder = builder.header("Content-Type", "application/json");
        let req = if let Some(b) = body {
            builder.body(Body::from(b)).unwrap()
        } else {
            builder.body(Body::empty()).unwrap()
        };
        let resp = app.oneshot(req).await.unwrap();
        let status = resp.status();
        let bytes = resp.into_body().collect().await.unwrap().to_bytes();
        let v: Value = serde_json::from_slice(&bytes).unwrap_or(json!({"raw": String::from_utf8_lossy(&bytes)}));
        (status, v)
    }

    async fn send_auth(app: Router, method: Method, uri: &str, body: Option<String>) -> (StatusCode, Value) {
        let mut builder = Request::builder().method(method).uri(uri);
        builder = builder.header("Content-Type", "application/json");
        builder = builder.header("Authorization", "Bearer admin-secret");
        let req = if let Some(b) = body {
            builder.body(Body::from(b)).unwrap()
        } else {
            builder.body(Body::empty()).unwrap()
        };
        let resp = app.oneshot(req).await.unwrap();
        let status = resp.status();
        let bytes = resp.into_body().collect().await.unwrap().to_bytes();
        let v: Value = serde_json::from_slice(&bytes).unwrap_or(json!({"raw": String::from_utf8_lossy(&bytes)}));
        (status, v)
    }

    // ── Public routes ────────────────────────────────────────

    #[tokio::test]
    async fn health_endpoint() {
        let app = test_app();
        let (status, body) = send(app, Method::GET, "/health", None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
        assert_eq!(body["service"], "nova-edge");
        assert!(body["version"].is_string());
    }

    #[tokio::test]
    async fn resolve_unknown_host() {
        let app = test_app();
        let (status, body) = send(app, Method::GET, "/resolve?host=unknown.com", None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], false);
    }

    #[tokio::test]
    async fn frp_ping() {
        let app = test_app();
        let (status, body) = send(
            app,
            Method::POST,
            "/frp/handler?op=Ping",
            Some("{}".to_string()),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["reject"], false);
    }

    #[tokio::test]
    async fn frp_login_valid() {
        let app = test_app();
        let (status, body) = send(
            app,
            Method::POST,
            "/frp/handler?op=Login",
            Some(r#"{"user":{"metas":{"token":"admin-secret"}}}"#.to_string()),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["reject"], false);
    }

    #[tokio::test]
    async fn frp_login_alt_token() {
        let app = test_app();
        let (status, body) = send(
            app,
            Method::POST,
            "/frp/handler?op=Login",
            Some(r#"{"user":{"metas":{"token":"alt-secret"}}}"#.to_string()),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["reject"], false);
    }

    #[tokio::test]
    async fn frp_login_invalid() {
        let app = test_app();
        let (status, body) = send(
            app,
            Method::POST,
            "/frp/handler?op=Login",
            Some(r#"{"user":{"metas":{"token":"wrong"}}}"#.to_string()),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["reject"], true);
    }

    // ── Auth-protected admin routes ──────────────────────────

    #[tokio::test]
    async fn admin_rejects_no_auth() {
        let app = test_app();
        let (status, _body) = send(app, Method::GET, "/admin/domains/verify?host=x.com", None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn admin_accepts_valid_auth() {
        let app = test_app();
        let (status, _body) = send_auth(
            app,
            Method::GET,
            "/admin/domains/verify?host=x.com",
            None,
        )
        .await;
        // 404 because domain doesn't exist, but NOT 401
        assert_eq!(status, StatusCode::NOT_FOUND);
    }

    // ── Full workflow: register → verify → resolve → remove ──

    #[tokio::test]
    async fn full_domain_workflow() {
        let app = test_app();

        // 1. Register a proxy with a custom domain
        let (status, body) = send_auth(
            app.clone(),
            Method::POST,
            "/admin/proxies",
            Some(
                json!({
                    "userId": "u1",
                    "studioId": "s1",
                    "proxyName": "myapp",
                    "proxyType": "http",
                    "localIP": "10.0.0.5",
                    "localPort": 3000,
                    "subdomain": "testapp",
                    "customDomains": ["mydomain.com"]
                })
                .to_string(),
            ),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "upsert failed: {body}");
        assert_eq!(body["ok"], true);

        // 2. Resolve the subdomain (public route)
        let (status, body) = send(
            app.clone(),
            Method::GET,
            "/resolve?host=testapp.dlx.studio",
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "resolve subdomain failed: {body}");
        assert_eq!(body["ok"], true);

        // 3. Check verification for custom domain (admin route)
        let (status, body) = send_auth(
            app.clone(),
            Method::GET,
            "/admin/domains/verify?host=mydomain.com",
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "check verification failed: {body}");
        assert_eq!(body["ok"], true);
        assert!(body["verification"].is_object());

        // 4. Sync proxy state
        let (status, body) = send_auth(
            app.clone(),
            Method::POST,
            "/admin/proxies/myapp/sync",
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "sync failed: {body}");
        assert_eq!(body["proxyName"], "myapp");

        // 5. List proxy domains
        let (status, body) = send_auth(
            app.clone(),
            Method::GET,
            "/admin/proxies/myapp/domains",
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "list domains failed: {body}");
        assert!(body["result"].is_array());

        // 6. List studio domains
        let (status, body) = send_auth(
            app.clone(),
            Method::GET,
            "/admin/studios/s1/domains",
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "list studio domains failed: {body}");
        assert_eq!(body["studioId"], "s1");

        // 7. Disable the proxy
        let (status, body) = send_auth(
            app.clone(),
            Method::DELETE,
            "/admin/proxies/myapp",
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "disable failed: {body}");
        assert_eq!(body["ok"], true);
    }
}
