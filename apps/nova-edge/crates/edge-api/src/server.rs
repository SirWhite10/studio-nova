use axum::{
    Router,
    body::Body,
    extract::State,
    http::{Request, Response, StatusCode},
    middleware,
    routing::{any, delete, get, post},
};
use edge_store::{DomainStore, live_cache::LiveCache};
use edge_tunnel::{registry::TunnelRegistry, transport::{TunnelRequest, forward_request_over_connector}};
use http_body_util::BodyExt;
use std::sync::Arc;

use crate::handlers;
use crate::middleware::auth::auth_middleware;

#[derive(Clone)]
pub struct AppState {
    pub store: Arc<dyn DomainStore>,
    pub admin_token: String,
    pub admin_tokens: Vec<String>,
    pub dns_resolver: Arc<dyn crate::verification::DnsResolver>,
    pub live_cache: Option<Arc<LiveCache>>,
    pub tunnel_registry: Option<Arc<TunnelRegistry>>,
}

pub fn create_router(
    store: Arc<dyn DomainStore>,
    admin_token: String,
    admin_tokens: Vec<String>,
    dns_resolver: Arc<dyn crate::verification::DnsResolver>,
) -> Router {
    create_router_with_live_cache(store, admin_token, admin_tokens, dns_resolver, None)
}

pub fn create_router_with_tunnel_registry(
    store: Arc<dyn DomainStore>,
    admin_token: String,
    admin_tokens: Vec<String>,
    dns_resolver: Arc<dyn crate::verification::DnsResolver>,
    live_cache: Option<Arc<LiveCache>>,
    tunnel_registry: Option<Arc<TunnelRegistry>>,
) -> Router {
    create_router_internal(store, admin_token, admin_tokens, dns_resolver, live_cache, tunnel_registry)
}

pub fn create_router_with_live_cache(
    store: Arc<dyn DomainStore>,
    admin_token: String,
    admin_tokens: Vec<String>,
    dns_resolver: Arc<dyn crate::verification::DnsResolver>,
    live_cache: Option<Arc<LiveCache>>,
) -> Router {
    create_router_internal(store, admin_token, admin_tokens, dns_resolver, live_cache, None)
}

fn create_router_internal(
    store: Arc<dyn DomainStore>,
    admin_token: String,
    admin_tokens: Vec<String>,
    dns_resolver: Arc<dyn crate::verification::DnsResolver>,
    live_cache: Option<Arc<LiveCache>>,
    tunnel_registry: Option<Arc<TunnelRegistry>>,
) -> Router {
    let state = AppState {
        store: store.clone(),
        admin_token: admin_token.clone(),
        admin_tokens: admin_tokens.clone(),
        dns_resolver: dns_resolver.clone(),
        live_cache,
        tunnel_registry,
    };

    Router::new()
        // Health + resolve (public)
        .route("/health", get(handlers::health::health))
        .route("/resolve", get(handlers::health::resolve))
        // FRP plugin handler
        .route("/frp/handler", post(handlers::frp::handle))
        // Admin API (authenticated)
        .nest(
            "/admin",
            admin_routes(store, admin_token, admin_tokens, dns_resolver),
        )
        // Public workspace traffic: Host -> LiveCache -> upstream HTTP runtime
        .fallback(any(proxy_workspace_request))
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
        live_cache: None,
        tunnel_registry: None,
    };

    Router::new()
        .route(
            "/domains/verify",
            get(handlers::domains::check_verification),
        )
        .route("/domains/verify", post(handlers::domains::verify))
        .route("/domains/{host}", delete(handlers::domains::remove))
        .route("/proxies", post(handlers::proxies::upsert))
        .route("/proxies/{name}/sync", post(handlers::proxies::sync))
        .route(
            "/proxies/{name}/domains",
            get(handlers::proxies::list_domains),
        )
        .route("/proxies/{name}", delete(handlers::proxies::disable))
        .route(
            "/studios/{id}/domains",
            get(handlers::studios::list_domains),
        )
        .layer(middleware::from_fn_with_state(state, auth_middleware))
}

async fn proxy_workspace_request(
    State(state): State<AppState>,
    req: Request<Body>,
) -> Response<Body> {
    let host = req
        .headers()
        .get("host")
        .and_then(|h| h.to_str().ok())
        .or_else(|| req.uri().host())
        .or_else(|| req.uri().authority().map(|a| a.as_str()))
        .unwrap_or("")
        .split(':')
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();

    let resolution = match state.store.resolve_host(&host).await {
        Ok(Some(resolution)) => resolution,
        Ok(None) => {
            tracing::warn!(host = %host, "workspace proxy host not found in store");
            return Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body(Body::from("workspace host not found"))
                .unwrap();
        }
        Err(e) => {
            tracing::warn!(host = %host, error = %e, "workspace proxy resolution failed");
            return Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .body(Body::from("workspace proxy resolution failed"))
                .unwrap();
        }
    };

    let path_and_query = req
        .uri()
        .path_and_query()
        .map(|p| p.as_str().to_string())
        .unwrap_or_else(|| "/".to_string());
    tracing::info!(host = %host, proxy = %resolution.proxy.proxy_name, upstream_ip = %resolution.proxy.local_ip, upstream_port = resolution.proxy.local_port, path = %path_and_query, "proxying workspace request");
    let upstream = format!(
        "http://{}:{}{}",
        resolution.proxy.local_ip, resolution.proxy.local_port, path_and_query
    );

    let method = req.method().clone();
    let headers = req.headers().clone();
    let body = match req.into_body().collect().await {
        Ok(collected) => collected.to_bytes(),
        Err(e) => {
            tracing::warn!(host = %host, error = %e, "failed to read request body");
            return Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(Body::from("failed to read request body"))
                .unwrap();
        }
    };

    if let Some(registry) = &state.tunnel_registry {
        if let Some(connector) = registry.select_connector(&resolution.proxy.proxy_name) {
            let tunnel_req = TunnelRequest {
                method: method.to_string(),
                host: host.clone(),
                path: path_and_query.to_string(),
                headers: headers
                    .iter()
                    .filter_map(|(name, value)| value.to_str().ok().map(|v| (name.to_string(), v.to_string())))
                    .collect(),
                body: body.clone(),
            };
            match forward_request_over_connector(connector, &resolution.proxy.proxy_name, &tunnel_req).await {
                Ok(resp) => {
                    let mut out = Response::builder().status(resp.status);
                    for (name, value) in resp.headers {
                        let header = name.to_ascii_lowercase();
                        if matches!(header.as_str(), "connection" | "keep-alive" | "proxy-authenticate" | "proxy-authorization" | "te" | "trailer" | "transfer-encoding" | "upgrade") {
                            continue;
                        }
                        out = out.header(name, value);
                    }
                    return out.body(Body::from(resp.body)).unwrap();
                }
                Err(e) => {
                    tracing::warn!(host = %host, proxy = %resolution.proxy.proxy_name, error = %e, "tunnel workspace upstream unavailable");
                    return Response::builder()
                        .status(StatusCode::BAD_GATEWAY)
                        .body(Body::from("tunnel workspace upstream unavailable"))
                        .unwrap();
                }
            }
        }
    }

    let client = reqwest::Client::new();
    let mut builder = client.request(method, &upstream);
    for (name, value) in headers.iter() {
        if name.as_str().eq_ignore_ascii_case("host") {
            continue;
        }
        builder = builder.header(name, value);
    }

    match builder.body(body).send().await {
        Ok(resp) => {
            let status = resp.status();
            let response_headers = resp.headers().clone();
            match resp.bytes().await {
                Ok(bytes) => {
                    let mut out = Response::builder().status(status);
                    for (name, value) in response_headers.iter() {
                        let header = name.as_str();
                        if matches!(
                            header.to_ascii_lowercase().as_str(),
                            "connection"
                                | "keep-alive"
                                | "proxy-authenticate"
                                | "proxy-authorization"
                                | "te"
                                | "trailer"
                                | "transfer-encoding"
                                | "upgrade"
                        ) {
                            continue;
                        }
                        out = out.header(name, value);
                    }
                    out.body(Body::from(bytes)).unwrap()
                }
                Err(e) => {
                    tracing::warn!(host = %host, upstream = %upstream, error = %e, "failed to read upstream response");
                    Response::builder()
                        .status(StatusCode::BAD_GATEWAY)
                        .body(Body::from("failed to read upstream response"))
                        .unwrap()
                }
            }
        }
        Err(e) => {
            tracing::warn!(host = %host, upstream = %upstream, error = %e, "workspace upstream unavailable");
            Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .body(Body::from("workspace upstream unavailable"))
                .unwrap()
        }
    }
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
    use serde_json::{Value, json};
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

    async fn send(
        app: Router,
        method: Method,
        uri: &str,
        body: Option<String>,
    ) -> (StatusCode, Value) {
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
        let v: Value = serde_json::from_slice(&bytes)
            .unwrap_or(json!({"raw": String::from_utf8_lossy(&bytes)}));
        (status, v)
    }

    async fn send_auth(
        app: Router,
        method: Method,
        uri: &str,
        body: Option<String>,
    ) -> (StatusCode, Value) {
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
        let v: Value = serde_json::from_slice(&bytes)
            .unwrap_or(json!({"raw": String::from_utf8_lossy(&bytes)}));
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
        assert_eq!(body["ok"], true);
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
        assert_eq!(body["ok"], true);
        assert_eq!(body["op"], "Login");
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
        assert_eq!(body["ok"], true);
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
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert_eq!(body["ok"], false);
    }

    // ── Auth-protected admin routes ──────────────────────────

    #[tokio::test]
    async fn admin_rejects_no_auth() {
        let app = test_app();
        let (status, _body) =
            send(app, Method::GET, "/admin/domains/verify?host=x.com", None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn admin_accepts_valid_auth() {
        let app = test_app();
        let (status, _body) =
            send_auth(app, Method::GET, "/admin/domains/verify?host=x.com", None).await;
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
        let (status, body) =
            send_auth(app.clone(), Method::POST, "/admin/proxies/myapp/sync", None).await;
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
        let (status, body) =
            send_auth(app.clone(), Method::GET, "/admin/studios/s1/domains", None).await;
        assert_eq!(status, StatusCode::OK, "list studio domains failed: {body}");
        assert_eq!(body["studioId"], "s1");

        // 7. Disable the proxy
        let (status, body) =
            send_auth(app.clone(), Method::DELETE, "/admin/proxies/myapp", None).await;
        assert_eq!(status, StatusCode::OK, "disable failed: {body}");
        assert_eq!(body["ok"], true);
    }
}
