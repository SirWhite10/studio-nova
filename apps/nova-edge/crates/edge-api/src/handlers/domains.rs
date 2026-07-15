use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use serde_json::{Value, json};
use std::collections::HashMap;

use crate::server::AppState;
use crate::types::VerifyDomainRequest;
use crate::validation::normalize_host;

/// GET /admin/domains/verify?host=...
pub async fn check_verification(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let host = normalize_host(params.get("host").map(|s| s.as_str()).unwrap_or(""));

    if host.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "host parameter required" })),
        ));
    }

    match state.store.get_domain_by_host(&host).await {
        Ok(Some(resolution)) => {
            let domain = &resolution.domain;
            let verification = if domain.verification_token.is_some() {
                let token = domain.verification_token.clone().unwrap_or_default();
                let record_name = crate::verification::build_txt_record_name(&host, "_nova-domain");
                Some(json!({
                    "host": host,
                    "recordName": record_name,
                    "expectedValue": token,
                    "foundValues": [],
                    "verified": domain.status == edge_store::types::DomainStatus::Active
                        || domain.status == edge_store::types::DomainStatus::Verified,
                }))
            } else {
                None
            };

            Ok(Json(json!({
                "ok": true,
                "host": host,
                "status": domain.status.to_string(),
                "verification": verification,
            })))
        }
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "ok": false, "error": "not_found", "host": host })),
        )),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": e.to_string() })),
        )),
    }
}

/// POST /admin/domains/verify
pub async fn verify(
    State(state): State<AppState>,
    Json(body): Json<VerifyDomainRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let host = normalize_host(&body.host);

    // Look up the domain to get the expected verification token
    let resolution = match state.store.get_domain_by_host(&host).await {
        Ok(Some(r)) => r,
        Ok(None) => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(json!({ "ok": false, "error": "not_found", "host": host })),
            ));
        }
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "ok": false, "error": e.to_string() })),
            ));
        }
    };

    let expected_token = match &resolution.domain.verification_token {
        Some(t) => t.clone(),
        None => {
            // No token needed — already active or auto-verified
            return Ok(Json(json!({
                "ok": true,
                "host": host,
                "activated": false,
                "status": resolution.domain.status.to_string(),
            })));
        }
    };

    // Perform DNS TXT verification using the injected resolver
    let verification = crate::verification::verify_with_resolver(
        state.dns_resolver.as_ref(),
        &host,
        &expected_token,
        "_nova-domain",
    )
    .await
    .unwrap_or_else(|_| crate::verification::VerificationResult {
        host: host.clone(),
        record_name: crate::verification::build_txt_record_name(&host, "_nova-domain"),
        expected_value: expected_token.clone(),
        found_values: vec![],
        verified: false,
    });

    let activated = verification.verified;

    if activated {
        // Activate the domain
        if let Err(e) = state.store.set_domain_status(&host, "active").await {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(
                    json!({ "ok": false, "error": format!("verified but activation failed: {e}") }),
                ),
            ));
        }
    }

    Ok(Json(json!({
        "ok": true,
        "host": host,
        "activated": activated,
        "status": if activated { "active".to_string() } else { resolution.domain.status.to_string() },
        "verification": {
            "host": verification.host,
            "recordName": verification.record_name,
            "expectedValue": verification.expected_value,
            "foundValues": verification.found_values,
            "verified": verification.verified,
        },
    })))
}

/// POST /admin/domain-bindings/verify
///
/// Verifies a versioned Domain Binding without requiring a legacy
/// workspace_proxy/proxy_domain pair. Nova Cloud owns the state transition;
/// Horizon owns the DNS check and TLS host authorization.
pub async fn verify_domain_binding(
    State(state): State<AppState>,
    Json(body): Json<VerifyDomainRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let host = normalize_host(&body.host);
    let binding = state
        .store
        .get_domain_binding_verification(&host)
        .await
        .map_err(|error| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "ok": false, "error": error.to_string() })),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(json!({ "ok": false, "error": "not_found", "host": host })),
            )
        })?;

    if binding.ownership_status == "revoked" {
        return Err((
            StatusCode::CONFLICT,
            Json(json!({ "ok": false, "error": "domain binding is revoked" })),
        ));
    }
    let token = binding.verification_token.ok_or_else(|| {
        (
            StatusCode::CONFLICT,
            Json(json!({ "ok": false, "error": "domain binding has no verification token" })),
        )
    })?;
    let expected_token = if token.starts_with("nova-domain=") {
        token
    } else {
        format!("nova-domain={token}")
    };
    let verification = crate::verification::verify_with_resolver(
        state.dns_resolver.as_ref(),
        &host,
        &expected_token,
        "_nova-domain",
    )
    .await
    .unwrap_or_else(|_| crate::verification::VerificationResult {
        host: host.clone(),
        record_name: crate::verification::build_txt_record_name(&host, "_nova-domain"),
        expected_value: expected_token,
        found_values: vec![],
        verified: false,
    });

    if verification.verified {
        if let Some(cache) = &state.live_cache {
            cache.allow_route_host(&host);
        }
    }

    Ok(Json(json!({
        "ok": true,
        "host": host,
        "activated": verification.verified,
        "status": if verification.verified { "active" } else { "pending" },
        "verification": verification,
    })))
}

/// DELETE /admin/domains/:host?studioId=...
pub async fn remove(
    State(state): State<AppState>,
    Path(host): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let host = normalize_host(&host);
    let studio_id = params.get("studioId").cloned();

    match state.store.remove_domain(&host, studio_id.as_deref()).await {
        Ok(removed) => Ok(Json(json!({
            "ok": true,
            "host": host,
            "removed": removed,
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
    use axum::{
        Router, middleware,
        routing::{delete, get, post},
    };
    use edge_store::memory_store::MemoryStore;
    use edge_store::types::*;
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
            .route("/domains/verify", get(check_verification).post(verify))
            .route("/domains/{host}", delete(remove))
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

    // Helper to seed a domain in the store
    async fn seed_domain(store: &dyn edge_store::DomainStore) {
        store
            .upsert_proxy(ProxyUpsertInput {
                user_id: "u1".into(),
                studio_id: "s1".into(),
                runtime_id: None,
                proxy_name: "test-proxy".into(),
                proxy_type: None,
                local_ip: Some("127.0.0.1".into()),
                local_port: 3000,
                remote_port: None,
                frpc_client_id: None,
                enabled: Some(true),
                subdomain: Some("myapp".into()),
                custom_domains: Some(vec!["10.cloud".into()]),
            })
            .await
            .expect("seed should work");
    }

    // ── check_verification ─────────────────────────────────────

    #[tokio::test]
    async fn check_verification_found_pending() {
        let state = make_state();
        seed_domain(state.store.as_ref()).await;
        let app = build_app(state);

        let (status, body) = send_request(
            app,
            Method::GET,
            "/domains/verify?host=10.cloud",
            true,
            None,
        )
        .await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
        assert_eq!(body["host"], "10.cloud");
        assert_eq!(body["status"], "pending");
        assert!(body["verification"].is_object());
    }

    #[tokio::test]
    async fn check_verification_not_found() {
        let state = make_state();
        let app = build_app(state);

        let (status, body) = send_request(
            app,
            Method::GET,
            "/domains/verify?host=unknown.com",
            true,
            None,
        )
        .await;

        assert_eq!(status, StatusCode::NOT_FOUND);
        assert_eq!(body["ok"], false);
    }

    // ── verify ─────────────────────────────────────────────────

    #[tokio::test]
    async fn verify_domain_found_but_dns_fails() {
        let state = make_state();
        seed_domain(state.store.as_ref()).await;
        let app = build_app(state);

        let (status, body) = send_request(
            app,
            Method::POST,
            "/domains/verify",
            true,
            Some(r#"{ "host": "10.cloud" }"#.into()),
        )
        .await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
        // MockDnsResolver returns empty vec, so verification should fail
        assert_eq!(body["activated"], false);
    }

    #[tokio::test]
    async fn verify_domain_not_found() {
        let state = make_state();
        let app = build_app(state);

        let (status, _body) = send_request(
            app,
            Method::POST,
            "/domains/verify",
            true,
            Some(r#"{ "host": "nope.com" }"#.into()),
        )
        .await;

        assert_eq!(status, StatusCode::NOT_FOUND);
    }

    // ── remove ─────────────────────────────────────────────────

    #[tokio::test]
    async fn remove_existing_domain() {
        let state = make_state();
        seed_domain(state.store.as_ref()).await;
        let app = build_app(state);

        let (status, body) = send_request(
            app,
            Method::DELETE,
            "/domains/10.cloud?studioId=s1",
            true,
            None,
        )
        .await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
        assert_eq!(body["removed"], true);
    }

    #[tokio::test]
    async fn remove_nonexistent_domain() {
        let state = make_state();
        let app = build_app(state);

        let (status, body) =
            send_request(app, Method::DELETE, "/domains/nope.com", true, None).await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ok"], true);
        // remove_domain returns false for nonexistent domains
        assert_eq!(body["removed"], false);
    }
}
