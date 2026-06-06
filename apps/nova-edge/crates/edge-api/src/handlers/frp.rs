use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
};
use serde::Deserialize;
use serde_json::{Value, json};

use crate::server::AppState;

#[derive(Debug, Deserialize)]
pub struct OpQuery {
    op: Option<String>,
}

/// POST /frp/handler?op=Login|NewProxy|Ping|NewUserConn|CloseProxy
pub async fn handle(
    State(state): State<AppState>,
    Query(params): Query<OpQuery>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let op = params.op.unwrap_or_default();

    match op.as_str() {
        "Login" => handle_login(&state, &body),
        "NewProxy" => handle_new_proxy(&state, &body).await,
        "Ping" | "NewUserConn" | "CloseProxy" => {
            // Always allow these operations
            Ok(Json(json!({ "ok": true, "op": op })))
        }
        _ => Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "unknown_op", "op": op })),
        )),
    }
}

fn handle_login(state: &AppState, body: &Value) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let token = body
        .get("user")
        .and_then(|u| u.get("metas"))
        .and_then(|m| m.get("token"))
        .and_then(|t| t.as_str())
        .unwrap_or("");

    if token == state.admin_token || state.admin_tokens.iter().any(|t| t == token) {
        Ok(Json(json!({ "ok": true, "op": "Login" })))
    } else {
        Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "ok": false, "error": "invalid_token", "op": "Login" })),
        ))
    }
}

async fn handle_new_proxy(
    state: &AppState,
    body: &Value,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let proxy_name = body
        .get("proxy_name")
        .and_then(|p| p.as_str())
        .unwrap_or("");

    if proxy_name.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "proxy_name required", "op": "NewProxy" })),
        ));
    }

    match state.store.get_proxy_by_name(proxy_name).await {
        Ok(Some(_proxy)) => Ok(Json(
            json!({ "ok": true, "op": "NewProxy", "proxyName": proxy_name }),
        )),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(
                json!({ "ok": false, "error": "proxy_not_found", "op": "NewProxy", "proxyName": proxy_name }),
            ),
        )),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": e.to_string(), "op": "NewProxy" })),
        )),
    }
}

// ── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{Router, routing::post};
    use edge_store::memory_store::MemoryStore;
    use edge_store::types::ProxyUpsertInput;
    use http::{Method, Request as HttpRequest};
    use http_body_util::BodyExt;
    use std::sync::Arc;
    use tower::ServiceExt;

    fn make_state() -> AppState {
        crate::server::AppState {
            store: Arc::new(MemoryStore::new()) as Arc<dyn edge_store::DomainStore>,
            admin_token: "admin-secret".to_string(),
            admin_tokens: vec!["secondary-token".to_string()],
            dns_resolver: Arc::new(crate::verification::MockDnsResolver::new(vec![])),
            live_cache: None,
        }
    }

    fn build_app(state: AppState) -> Router {
        Router::new()
            .route("/frp/handler", post(handle))
            .with_state(state)
    }

    async fn send_request(app: Router, uri: &str, body: Option<String>) -> (StatusCode, Value) {
        let mut builder = HttpRequest::builder()
            .method(Method::POST)
            .uri(uri)
            .header("Content-Type", "application/json");

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

    async fn seed_proxy(store: &dyn edge_store::DomainStore) {
        store
            .upsert_proxy(ProxyUpsertInput {
                user_id: "u1".into(),
                studio_id: "s1".into(),
                runtime_id: None,
                proxy_name: "registered-proxy".into(),
                proxy_type: Some(edge_store::types::ProxyType::Http),
                local_ip: Some("127.0.0.1".into()),
                local_port: 3000,
                remote_port: None,
                frpc_client_id: None,
                enabled: Some(true),
                subdomain: None,
                custom_domains: None,
            })
            .await
            .expect("seed should work");
    }

    // ── login valid (primary token) ───────────────────────────

    #[tokio::test]
    async fn login_valid_primary_token() {
        let state = make_state();
        let app = build_app(state);

        let (status, body) = send_request(
            app,
            "/frp/handler?op=Login",
            Some(r#"{ "user": { "metas": { "token": "admin-secret" } } }"#.into()),
        )
        .await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
        assert_eq!(body["op"], "Login");
    }

    // ── login valid (secondary token) ─────────────────────────

    #[tokio::test]
    async fn login_valid_secondary_token() {
        let state = make_state();
        let app = build_app(state);

        let (status, body) = send_request(
            app,
            "/frp/handler?op=Login",
            Some(r#"{ "user": { "metas": { "token": "secondary-token" } } }"#.into()),
        )
        .await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
    }

    // ── login invalid token ───────────────────────────────────

    #[tokio::test]
    async fn login_invalid_token() {
        let state = make_state();
        let app = build_app(state);

        let (status, body) = send_request(
            app,
            "/frp/handler?op=Login",
            Some(r#"{ "user": { "metas": { "token": "wrong-token" } } }"#.into()),
        )
        .await;

        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert_eq!(body["ok"], false);
        assert_eq!(body["error"], "invalid_token");
    }

    // ── newproxy registered ───────────────────────────────────

    #[tokio::test]
    async fn newproxy_registered() {
        let state = make_state();
        seed_proxy(state.store.as_ref()).await;
        let app = build_app(state);

        let (status, body) = send_request(
            app,
            "/frp/handler?op=NewProxy",
            Some(r#"{ "proxy_name": "registered-proxy" }"#.into()),
        )
        .await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
        assert_eq!(body["op"], "NewProxy");
        assert_eq!(body["proxyName"], "registered-proxy");
    }

    // ── newproxy unknown ──────────────────────────────────────

    #[tokio::test]
    async fn newproxy_unknown() {
        let state = make_state();
        let app = build_app(state);

        let (status, body) = send_request(
            app,
            "/frp/handler?op=NewProxy",
            Some(r#"{ "proxy_name": "unknown-proxy" }"#.into()),
        )
        .await;

        assert_eq!(status, StatusCode::NOT_FOUND);
        assert_eq!(body["ok"], false);
        assert_eq!(body["error"], "proxy_not_found");
    }

    // ── ping allowed ──────────────────────────────────────────

    #[tokio::test]
    async fn ping_allowed() {
        let state = make_state();
        let app = build_app(state);

        let (status, body) = send_request(app, "/frp/handler?op=Ping", Some(r#"{}"#.into())).await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
        assert_eq!(body["op"], "Ping");
    }

    // ── unknown op rejected ───────────────────────────────────

    #[tokio::test]
    async fn unknown_op_rejected() {
        let state = make_state();
        let app = build_app(state);

        let (status, body) =
            send_request(app, "/frp/handler?op=SomethingElse", Some(r#"{}"#.into())).await;

        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert_eq!(body["ok"], false);
        assert_eq!(body["error"], "unknown_op");
    }
}
