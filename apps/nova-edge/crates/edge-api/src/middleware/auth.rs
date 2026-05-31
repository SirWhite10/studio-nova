use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
    Json,
};
use serde_json::json;

pub async fn auth_middleware(
    State(state): State<crate::server::AppState>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok());

    let is_valid = match auth_header {
        Some(header) => {
            let expected_primary = format!("Bearer {}", state.admin_token);
            if header == expected_primary {
                true
            } else {
                state
                    .admin_tokens
                    .iter()
                    .any(|t| header == format!("Bearer {}", t))
            }
        }
        None => false,
    };

    if is_valid {
        Ok(next.run(req).await)
    } else {
        Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "ok": false,
                "error": "unauthorized",
                "message": "valid Bearer token required"
            })),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{middleware, routing::get, Router};
    use edge_store::memory_store::MemoryStore;
    use http::{Method, Request as HttpRequest};
    use http_body_util::BodyExt;
    use std::sync::Arc;
    use tower::ServiceExt;

    async fn test_handler() -> &'static str {
        "ok"
    }

    fn make_state(admin_token: &str, admin_tokens: Vec<&str>) -> crate::server::AppState {
        crate::server::AppState {
            store: Arc::new(MemoryStore::new()) as Arc<dyn edge_store::DomainStore>,
            admin_token: admin_token.to_string(),
            admin_tokens: admin_tokens.iter().map(|s| s.to_string()).collect(),
            dns_resolver: Arc::new(crate::verification::MockDnsResolver::new(vec![])),
        }
    }

    fn build_app(state: crate::server::AppState) -> Router {
        Router::new()
            .route("/test", get(test_handler))
            .layer(middleware::from_fn_with_state(state, auth_middleware))
    }

    async fn send_request(app: Router, auth_header: Option<&str>) -> (StatusCode, String) {
        let mut builder = HttpRequest::builder().method(Method::GET).uri("/test");

        if let Some(val) = auth_header {
            builder = builder.header("Authorization", val);
        }

        let request = builder.body(Body::empty()).unwrap();
        let response = app.oneshot(request).await.unwrap();
        let status = response.status();
        let body = String::from_utf8(
            response
                .into_body()
                .collect()
                .await
                .unwrap()
                .to_bytes()
                .to_vec(),
        )
        .unwrap();
        (status, body)
    }

    #[tokio::test]
    async fn valid_bearer_token_passes_through() {
        let state = make_state("primary-token", vec![]);
        let app = build_app(state);
        let (status, body) = send_request(app, Some("Bearer primary-token")).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body, "ok");
    }

    #[tokio::test]
    async fn invalid_bearer_token_returns_401() {
        let state = make_state("primary-token", vec![]);
        let app = build_app(state);
        let (status, body) = send_request(app, Some("Bearer wrong-token")).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert!(body.contains("\"ok\":false"));
        assert!(body.contains("\"error\":\"unauthorized\""));
        assert!(body.contains("\"message\":\"valid Bearer token required\""));
    }

    #[tokio::test]
    async fn missing_authorization_header_returns_401() {
        let state = make_state("primary-token", vec![]);
        let app = build_app(state);
        let (status, body) = send_request(app, None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert!(body.contains("\"ok\":false"));
        assert!(body.contains("\"error\":\"unauthorized\""));
    }

    #[tokio::test]
    async fn malformed_header_returns_401() {
        let state = make_state("primary-token", vec![]);
        let app = build_app(state);
        let (status, body) = send_request(app, Some("Basic primary-token")).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert!(body.contains("\"error\":\"unauthorized\""));
    }

    #[tokio::test]
    async fn token_in_admin_tokens_list_passes() {
        let state = make_state("primary-token", vec!["secondary-a", "secondary-b"]);
        let app = build_app(state);
        let (status, body) = send_request(app, Some("Bearer secondary-a")).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body, "ok");
    }

    #[tokio::test]
    async fn token_not_in_any_list_returns_401() {
        let state = make_state("primary-token", vec!["secondary-a", "secondary-b"]);
        let app = build_app(state);
        let (status, body) = send_request(app, Some("Bearer unknown-token")).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert!(body.contains("\"error\":\"unauthorized\""));
    }
}
