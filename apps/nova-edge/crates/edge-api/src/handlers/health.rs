use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
};
use serde::Deserialize;
use serde_json::{Value, json};

use crate::server::AppState;

#[derive(Debug, Deserialize)]
pub struct ResolveQuery {
    host: Option<String>,
}

/// GET /health
pub async fn health(
    State(state): State<AppState>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let store_health = match state.store.health().await {
        Ok(h) => h,
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "ok": false, "error": e.to_string() })),
            ));
        }
    };
    let readiness = state.store.readiness().await.map_err(|error| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "ok": false, "error": error.to_string() })),
        )
    })?;
    let connected_tunnels = state
        .tunnel_registry
        .as_ref()
        .map_or(0, |registry| registry.client_count());
    let route_hosts = state
        .live_cache
        .as_ref()
        .map_or(0, |cache| cache.route_host_count());
    let ready = store_health.ok && readiness["ok"].as_bool().unwrap_or(false);

    let payload = Json(json!({
        "ok": ready,
        "service": "nova-edge",
        "version": env!("CARGO_PKG_VERSION"),
        "store": store_health,
        "checks": readiness,
        "tunnel": {
            "connectedClients": connected_tunnels,
            "authorizedRouteHosts": route_hosts,
        }
    }));
    if ready {
        Ok(payload)
    } else {
        Err((StatusCode::SERVICE_UNAVAILABLE, payload))
    }
}

/// GET /resolve?host=...
pub async fn resolve(
    State(state): State<AppState>,
    Query(params): Query<ResolveQuery>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let raw_host = match params.host {
        Some(h) if !h.trim().is_empty() => h,
        _ => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(json!({ "ok": false, "error": "host parameter required" })),
            ));
        }
    };

    let host = crate::validation::normalize_host(&raw_host);

    match state.store.resolve_host(&host).await {
        Ok(Some(resolution)) => Ok(Json(json!({
            "ok": true,
            "host": host,
            "kind": resolution.domain.kind.to_string(),
            "result": {
                "proxyName": resolution.proxy.proxy_name,
                "enabled": resolution.proxy.enabled,
                "localIP": resolution.proxy.local_ip,
                "localPort": resolution.proxy.local_port,
                "domainHost": resolution.domain.host,
                "domainStatus": resolution.domain.status.to_string(),
            },
        }))),
        Ok(None) => Ok(Json(json!({
            "ok": false,
            "error": "not_found",
        }))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": e.to_string() })),
        )),
    }
}

// ── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{Router, routing::get};
    use edge_store::memory_store::MemoryStore;
    use edge_store::types::ProxyUpsertInput;
    use http::{Method, Request as HttpRequest};
    use http_body_util::BodyExt;
    use std::sync::Arc;
    use tower::ServiceExt;

    fn make_state() -> AppState {
        crate::server::AppState {
            store: Arc::new(MemoryStore::new()) as Arc<dyn edge_store::DomainStore>,
            admin_token: "test-token".to_string(),
            admin_tokens: vec![],
            dns_resolver: Arc::new(crate::verification::MockDnsResolver::new(vec![])),
            live_cache: None,
            tunnel_registry: None,
        }
    }

    fn build_app(state: AppState) -> Router {
        Router::new()
            .route("/health", get(health))
            .route("/resolve", get(resolve))
            .with_state(state)
    }

    async fn send_request(app: Router, method: Method, uri: &str) -> (StatusCode, Value) {
        let request = HttpRequest::builder()
            .method(method)
            .uri(uri)
            .body(axum::body::Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        let status = response.status();
        let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
        let body_str = String::from_utf8_lossy(&body_bytes);
        let json: Value = serde_json::from_str(&body_str).unwrap_or(json!({ "raw": body_str }));
        (status, json)
    }

    async fn seed_proxy(store: &dyn edge_store::DomainStore) {
        store
            .upsert_proxy(ProxyUpsertInput {
                user_id: "u1".into(),
                studio_id: "s1".into(),
                runtime_id: None,
                proxy_name: "test-proxy".into(),
                proxy_type: Some(edge_store::types::ProxyType::Http),
                local_ip: Some("10.0.0.5".into()),
                local_port: 3000,
                remote_port: None,
                frpc_client_id: None,
                enabled: Some(true),
                subdomain: Some("myapp".into()),
                custom_domains: Some(vec!["example.com".into()]),
            })
            .await
            .expect("seed should work");
    }

    // ── health ok ─────────────────────────────────────────────

    #[tokio::test]
    async fn health_returns_ok() {
        let state = make_state();
        let app = build_app(state);

        let (status, body) = send_request(app, Method::GET, "/health").await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
        assert_eq!(body["service"], "nova-edge");
        assert!(body["version"].is_string());
        assert!(body["store"].is_object());
        assert_eq!(body["store"]["ok"], true);
    }

    // ── resolve found ─────────────────────────────────────────

    #[tokio::test]
    async fn resolve_found() {
        let state = make_state();
        seed_proxy(state.store.as_ref()).await;
        let app = build_app(state);

        let (status, body) = send_request(app, Method::GET, "/resolve?host=myapp.dlx.studio").await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
        assert_eq!(body["host"], "myapp.dlx.studio");
        assert_eq!(body["kind"], "subdomain");
        assert_eq!(body["result"]["proxyName"], "test-proxy");
        assert_eq!(body["result"]["enabled"], true);
    }

    // ── resolve not found ─────────────────────────────────────

    #[tokio::test]
    async fn resolve_not_found() {
        let state = make_state();
        let app = build_app(state);

        let (status, body) = send_request(app, Method::GET, "/resolve?host=unknown.com").await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], false);
        assert_eq!(body["error"], "not_found");
    }
}
