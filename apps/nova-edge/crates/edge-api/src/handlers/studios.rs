use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use serde_json::{Value, json};

use crate::server::AppState;

/// GET /admin/studios/{id}/domains
pub async fn list_domains(
    State(state): State<AppState>,
    Path(studio_id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match state.store.list_domains_for_studio(&studio_id).await {
        Ok(results) => Ok(Json(json!({
            "ok": true,
            "studioId": studio_id,
            "result": results.iter().map(|r| json!({
                "host": r.domain.host,
                "kind": r.domain.kind.to_string(),
                "status": r.domain.status.to_string(),
                "proxyName": r.proxy.proxy_name,
                "enabled": r.proxy.enabled,
            })).collect::<Vec<_>>(),
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
    use axum::{Router, middleware, routing::get};
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
            .route("/studios/{id}/domains", get(list_domains))
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
    ) -> (StatusCode, Value) {
        let mut builder = HttpRequest::builder().method(method).uri(uri);
        if auth {
            builder = builder.header("Authorization", "Bearer test-token");
        }

        let request = builder.body(axum::body::Body::empty()).unwrap();
        let response = app.oneshot(request).await.unwrap();
        let status = response.status();
        let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
        let body_str = String::from_utf8_lossy(&body_bytes);
        let json: Value = serde_json::from_str(&body_str).unwrap_or(json!({ "raw": body_str }));
        (status, json)
    }

    async fn seed_studio(store: &dyn edge_store::DomainStore) {
        store
            .upsert_proxy(ProxyUpsertInput {
                user_id: "u1".into(),
                studio_id: "studio-1".into(),
                runtime_id: None,
                proxy_name: "my-proxy".into(),
                proxy_type: Some(edge_store::types::ProxyType::Http),
                local_ip: Some("127.0.0.1".into()),
                local_port: 3000,
                remote_port: None,
                frpc_client_id: None,
                enabled: Some(true),
                subdomain: Some("myapp".into()),
                custom_domains: Some(vec!["custom.example".into()]),
            })
            .await
            .expect("seed should work");
    }

    // ── domains for studio ────────────────────────────────────

    #[tokio::test]
    async fn domains_for_studio() {
        let state = make_state();
        seed_studio(state.store.as_ref()).await;
        let app = build_app(state);

        let (status, body) =
            send_request(app, Method::GET, "/studios/studio-1/domains", true).await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
        assert_eq!(body["studioId"], "studio-1");
        assert!(body["result"].is_array());
        // 1 subdomain + 1 custom = 2
        assert_eq!(body["result"].as_array().unwrap().len(), 2);
    }

    // ── empty for unknown studio ──────────────────────────────

    #[tokio::test]
    async fn empty_for_unknown_studio() {
        let state = make_state();
        seed_studio(state.store.as_ref()).await;
        let app = build_app(state);

        let (status, body) =
            send_request(app, Method::GET, "/studios/no-such-studio/domains", true).await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
        assert_eq!(body["studioId"], "no-such-studio");
        assert!(body["result"].as_array().unwrap().is_empty());
    }
}
