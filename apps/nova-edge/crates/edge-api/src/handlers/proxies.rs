use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use edge_store::types::ProxyUpsertInput;
use serde_json::{Value, json};

use crate::server::AppState;
use crate::types::ProxyUpsertRequest;

/// POST /admin/proxies
pub async fn upsert(
    State(state): State<AppState>,
    Json(body): Json<ProxyUpsertRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let input = ProxyUpsertInput {
        user_id: body.user_id,
        studio_id: body.studio_id,
        runtime_id: body.runtime_id,
        proxy_name: body.proxy_name,
        proxy_type: body.proxy_type.and_then(|s| match s.as_str() {
            "http" => Some(edge_store::types::ProxyType::Http),
            "https" => Some(edge_store::types::ProxyType::Https),
            "tcp" => Some(edge_store::types::ProxyType::Tcp),
            "udp" => Some(edge_store::types::ProxyType::Udp),
            _ => None,
        }),
        local_ip: body.local_ip,
        local_port: body.local_port,
        remote_port: body.remote_port,
        frpc_client_id: body.frpc_client_id,
        enabled: body.enabled,
        subdomain: body.subdomain,
        custom_domains: body.custom_domains,
    };

    match state.store.upsert_proxy(input).await {
        Ok(results) => Ok(Json(json!({
            "ok": true,
            "result": results.iter().map(|r| json!({
                "proxy": {
                    "proxyName": r.proxy.proxy_name,
                    "enabled": r.proxy.enabled,
                },
                "domain": {
                    "host": r.domain.host,
                    "kind": r.domain.kind.to_string(),
                    "status": r.domain.status.to_string(),
                },
            })).collect::<Vec<_>>(),
        }))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": e.to_string() })),
        )),
    }
}

/// POST /admin/proxies/{name}/sync
pub async fn sync(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let proxy = match state.store.get_proxy_by_name(&name).await {
        Ok(Some(p)) => p,
        Ok(None) => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(json!({ "ok": false, "error": "not_found", "proxyName": name })),
            ));
        }
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "ok": false, "error": e.to_string() })),
            ));
        }
    };

    let domains = match state.store.list_proxy_domains(&name).await {
        Ok(d) => d,
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "ok": false, "error": e.to_string() })),
            ));
        }
    };

    // Derive cert_status: if any domain is active, certs are ready
    let cert_status = if domains
        .iter()
        .any(|d| d.domain.status == edge_store::types::DomainStatus::Active)
    {
        "ready"
    } else {
        "pending"
    };

    Ok(Json(json!({
        "ok": true,
        "proxyName": name,
        "domains": domains.iter().map(|d| json!({
            "host": d.domain.host,
            "kind": d.domain.kind.to_string(),
            "status": d.domain.status.to_string(),
        })).collect::<Vec<_>>(),
        "certStatus": cert_status,
        "enabled": proxy.enabled,
    })))
}

/// GET /admin/proxies/{name}/domains
pub async fn list_domains(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match state.store.list_proxy_domains(&name).await {
        Ok(domains) => Ok(Json(json!({
            "ok": true,
            "result": domains.iter().map(|d| json!({
                "host": d.domain.host,
                "kind": d.domain.kind.to_string(),
                "status": d.domain.status.to_string(),
            })).collect::<Vec<_>>(),
        }))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": e.to_string() })),
        )),
    }
}

/// DELETE /admin/proxies/{name}
pub async fn disable(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match state.store.disable_proxy(&name).await {
        Ok(()) => Ok(Json(json!({ "ok": true }))),
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
    use axum::{
        Router, middleware,
        routing::{delete, get, post},
    };
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
            .route("/proxies", post(upsert))
            .route("/proxies/{name}/sync", post(sync))
            .route("/proxies/{name}/domains", get(list_domains))
            .route("/proxies/{name}", delete(disable))
            .layer(middleware::from_fn_with_state(
                state.clone(),
                crate::middleware::auth::auth_middleware,
            ))
            .with_state(state)
    }

    async fn send_request(
        app: Router,
        method: Method,
        uri: &str,
        auth: bool,
        body: Option<String>,
    ) -> (StatusCode, Value) {
        let mut builder = HttpRequest::builder().method(method).uri(uri);
        if auth {
            builder = builder.header("Authorization", "Bearer test-token");
        }
        builder = builder.header("Content-Type", "application/json");

        let request = if let Some(b) = body {
            builder.body(axum::body::Body::from(b)).unwrap()
        } else {
            builder.body(axum::body::Body::empty()).unwrap()
        };

        let response = app.oneshot(request).await.unwrap();
        let status = response.status();
        let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
        let body_str = String::from_utf8_lossy(&body_bytes);
        let json: Value = serde_json::from_str(&body_str).unwrap_or(json!({ "raw": body_str }));
        (status, json)
    }

    fn seed_body() -> String {
        r#"{
            "userId": "u1",
            "studioId": "s1",
            "proxyName": "test-proxy",
            "proxyType": "http",
            "localIP": "10.0.0.5",
            "localPort": 3000,
            "subdomain": "myapp",
            "customDomains": ["example.com"]
        }"#
        .to_string()
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

    // ── upsert valid ──────────────────────────────────────────

    #[tokio::test]
    async fn upsert_valid_proxy() {
        let state = make_state();
        let app = build_app(state);

        let (status, body) =
            send_request(app, Method::POST, "/proxies", true, Some(seed_body())).await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
        assert!(body["result"].is_array());
        // 1 subdomain + 1 custom = 2 domains
        assert_eq!(body["result"].as_array().unwrap().len(), 2);
    }

    // ── sync found ────────────────────────────────────────────

    #[tokio::test]
    async fn sync_found() {
        let state = make_state();
        seed_proxy(state.store.as_ref()).await;
        let app = build_app(state);

        let (status, body) =
            send_request(app, Method::POST, "/proxies/test-proxy/sync", true, None).await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
        assert_eq!(body["proxyName"], "test-proxy");
        assert!(body["domains"].is_array());
        assert_eq!(body["certStatus"], "ready"); // subdomain auto-activates
    }

    // ── sync not found ────────────────────────────────────────

    #[tokio::test]
    async fn sync_not_found() {
        let state = make_state();
        let app = build_app(state);

        let (status, body) =
            send_request(app, Method::POST, "/proxies/no-such-proxy/sync", true, None).await;

        assert_eq!(status, StatusCode::NOT_FOUND);
        assert_eq!(body["ok"], false);
        assert_eq!(body["error"], "not_found");
    }

    // ── list domains ──────────────────────────────────────────

    #[tokio::test]
    async fn list_domains_returns_proxy_domains() {
        let state = make_state();
        seed_proxy(state.store.as_ref()).await;
        let app = build_app(state);

        let (status, body) =
            send_request(app, Method::GET, "/proxies/test-proxy/domains", true, None).await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
        assert!(body["result"].is_array());
        // 1 subdomain + 1 custom = 2
        assert_eq!(body["result"].as_array().unwrap().len(), 2);
    }

    // ── list domains for unknown proxy returns empty ──────────

    #[tokio::test]
    async fn list_domains_unknown_proxy() {
        let state = make_state();
        let app = build_app(state);

        let (status, body) = send_request(
            app,
            Method::GET,
            "/proxies/no-such-proxy/domains",
            true,
            None,
        )
        .await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
        assert!(body["result"].as_array().unwrap().is_empty());
    }

    // ── disable proxy ─────────────────────────────────────────

    #[tokio::test]
    async fn disable_proxy_succeeds() {
        let state = make_state();
        seed_proxy(state.store.as_ref()).await;
        let app = build_app(state);

        let (status, body) =
            send_request(app, Method::DELETE, "/proxies/test-proxy", true, None).await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
    }
}
