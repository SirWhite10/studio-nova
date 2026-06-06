//! HTTP to HTTPS redirect + ACME HTTP-01 challenge handler.
//!
//! Runs on port 80:
//! - `/.well-known/acme-challenge/<token>` → serves ACME challenge response
//! - All other requests → 301 redirect to HTTPS

use axum::{
    Router,
    extract::{Path, State},
    http::{HeaderMap, StatusCode, Uri},
    response::{IntoResponse, Redirect, Response},
    routing::get,
};
use std::collections::HashMap;
use std::path::{Path as FsPath, PathBuf};
use std::sync::Arc;

/// Shared state for the HTTP redirect server.
#[derive(Debug, Clone)]
pub struct HttpRedirectState {
    /// ACME HTTP-01 challenge tokens → key authorizations.
    challenges: Arc<std::sync::Mutex<HashMap<String, String>>>,
    /// The HTTPS port to redirect to.
    https_port: u16,
    /// Optional ACME webroot used by external HTTP-01 clients.
    webroot: Option<PathBuf>,
}

impl HttpRedirectState {
    pub fn new(https_port: u16) -> Self {
        Self {
            challenges: Arc::new(std::sync::Mutex::new(HashMap::new())),
            https_port,
            webroot: None,
        }
    }

    /// Create redirect state that serves ACME challenge files from a webroot.
    pub fn with_webroot(https_port: u16, webroot: impl AsRef<FsPath>) -> Self {
        Self {
            challenges: Arc::new(std::sync::Mutex::new(HashMap::new())),
            https_port,
            webroot: Some(webroot.as_ref().to_path_buf()),
        }
    }

    pub fn webroot(&self) -> Option<&FsPath> {
        self.webroot.as_deref()
    }

    /// Store an ACME challenge token + key authorization.
    pub fn set_challenge(&self, token: &str, key_auth: &str) {
        self.challenges
            .lock()
            .unwrap()
            .insert(token.to_string(), key_auth.to_string());
    }

    /// Remove a challenge token.
    pub fn remove_challenge(&self, token: &str) -> bool {
        self.challenges.lock().unwrap().remove(token).is_some()
    }

    /// Get a challenge key auth by token.
    pub fn get_challenge(&self, token: &str) -> Option<String> {
        self.challenges.lock().unwrap().get(token).cloned()
    }

    /// Number of pending challenges.
    pub fn challenge_count(&self) -> usize {
        self.challenges.lock().unwrap().len()
    }

    /// Build the HTTPS URL for a redirect.
    pub fn https_url_for(&self, uri: &Uri) -> String {
        let host = uri.host().unwrap_or("localhost");
        let path = uri.path_and_query().map(|pq| pq.as_str()).unwrap_or("/");
        if self.https_port == 443 {
            format!("https://{}{}", host, path)
        } else {
            format!("https://{}:{}{}", host, self.https_port, path)
        }
    }
}

/// Handles ACME HTTP-01 challenge requests.
///
/// Path: `/.well-known/acme-challenge/<token>`
async fn acme_challenge(
    State(state): State<Arc<HttpRedirectState>>,
    Path(token): Path<String>,
) -> Response {
    if !is_safe_acme_token(&token) {
        return StatusCode::NOT_FOUND.into_response();
    }

    if let Some(webroot) = state.webroot() {
        let challenge_path = webroot
            .join(".well-known")
            .join("acme-challenge")
            .join(&token);
        let direct_path = webroot.join(&token);
        let path = if challenge_path.exists() {
            challenge_path
        } else {
            direct_path
        };
        match tokio::fs::read_to_string(path).await {
            Ok(key_auth) => {
                return (StatusCode::OK, [("Content-Type", "text/plain")], key_auth)
                    .into_response();
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => {
                tracing::warn!(token = %token, error = %e, "failed to read ACME challenge webroot file");
                return StatusCode::NOT_FOUND.into_response();
            }
        }
    }

    match state.get_challenge(&token) {
        Some(key_auth) => {
            // ACME spec: return key authorization as plain text
            (StatusCode::OK, [("Content-Type", "text/plain")], key_auth).into_response()
        }
        None => StatusCode::NOT_FOUND.into_response(),
    }
}

fn is_safe_acme_token(token: &str) -> bool {
    !token.is_empty()
        && token
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_'))
}

/// Redirects all non-ACME requests to HTTPS.
async fn redirect_to_https(
    State(state): State<Arc<HttpRedirectState>>,
    headers: HeaderMap,
    uri: Uri,
) -> Response {
    // Use the Host header if available (more reliable than URI host)
    if let Some(host) = headers.get("host").and_then(|v| v.to_str().ok()) {
        let host = host.to_string();
        let path = uri.path_and_query().map(|pq| pq.as_str()).unwrap_or("/");
        let target = if state.https_port == 443 {
            format!("https://{}{}", host, path)
        } else {
            format!("https://{}:{}{}", host, state.https_port, path)
        };
        return Redirect::permanent(&target).into_response();
    }

    Redirect::permanent(&state.https_url_for(&uri)).into_response()
}

/// Build the HTTP redirect router.
pub fn http_redirect_router(state: Arc<HttpRedirectState>) -> Router {
    Router::new()
        .route("/.well-known/acme-challenge/{token}", get(acme_challenge))
        .fallback(redirect_to_https)
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    fn make_app() -> (Router, Arc<HttpRedirectState>) {
        let state = Arc::new(HttpRedirectState::new(443));
        let app = http_redirect_router(state.clone());
        (app, state)
    }

    #[tokio::test]
    async fn test_acme_challenge_returns_key_auth() {
        let (app, state) = make_app();
        state.set_challenge("test-token-123", "test-token-123.key-auth-value");

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/.well-known/acme-challenge/test-token-123")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = axum::body::to_bytes(response.into_body(), 1024)
            .await
            .unwrap();
        assert_eq!(&body[..], b"test-token-123.key-auth-value");
    }

    #[tokio::test]
    async fn test_acme_challenge_unknown_token_returns_404() {
        let (app, _state) = make_app();

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/.well-known/acme-challenge/unknown-token")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_redirect_to_https() {
        let (app, _state) = make_app();

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/some/path?query=1")
                    .header("host", "example.com")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::PERMANENT_REDIRECT);
        let location = response
            .headers()
            .get("location")
            .unwrap()
            .to_str()
            .unwrap();
        assert_eq!(location, "https://example.com/some/path?query=1");
    }

    #[tokio::test]
    async fn test_redirect_with_custom_port() {
        let state = Arc::new(HttpRedirectState::new(8443));
        let app = http_redirect_router(state.clone());

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/test")
                    .header("host", "example.com")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::PERMANENT_REDIRECT);
        let location = response
            .headers()
            .get("location")
            .unwrap()
            .to_str()
            .unwrap();
        assert_eq!(location, "https://example.com:8443/test");
    }

    #[tokio::test]
    async fn test_acme_challenge_serves_webroot_file_before_redirect() {
        let dir = tempfile::tempdir().unwrap();
        let token_path = dir
            .path()
            .join(".well-known")
            .join("acme-challenge")
            .join("file-token");
        std::fs::create_dir_all(token_path.parent().unwrap()).unwrap();
        std::fs::write(&token_path, "file-token.key-auth-from-disk").unwrap();

        let state = Arc::new(HttpRedirectState::with_webroot(443, dir.path()));
        let app = http_redirect_router(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/.well-known/acme-challenge/file-token")
                    .header("host", "example.com")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = axum::body::to_bytes(response.into_body(), 1024)
            .await
            .unwrap();
        assert_eq!(&body[..], b"file-token.key-auth-from-disk");
    }

    #[tokio::test]
    async fn test_challenge_lifecycle() {
        let state = HttpRedirectState::new(443);

        assert_eq!(state.challenge_count(), 0);

        state.set_challenge("token-a", "key-auth-a");
        state.set_challenge("token-b", "key-auth-b");
        assert_eq!(state.challenge_count(), 2);

        assert_eq!(
            state.get_challenge("token-a"),
            Some("key-auth-a".to_string())
        );
        assert_eq!(state.get_challenge("nonexistent"), None);

        assert!(state.remove_challenge("token-a"));
        assert_eq!(state.challenge_count(), 1);
        assert!(!state.remove_challenge("token-a")); // already removed
    }

    #[tokio::test]
    async fn test_https_url_for_standard_port() {
        let state = HttpRedirectState::new(443);
        let uri: Uri = "/path?q=1".parse().unwrap();
        // When there's no host in URI, falls back to "localhost"
        let url = state.https_url_for(&uri);
        assert_eq!(url, "https://localhost/path?q=1");
    }

    #[tokio::test]
    async fn test_https_url_for_custom_port() {
        let state = HttpRedirectState::new(8443);
        let uri: Uri = "/api/test".parse().unwrap();
        let url = state.https_url_for(&uri);
        assert_eq!(url, "https://localhost:8443/api/test");
    }

    #[tokio::test]
    async fn test_root_redirect() {
        let (app, _state) = make_app();

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/")
                    .header("host", "mysite.example.com")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::PERMANENT_REDIRECT);
        let location = response
            .headers()
            .get("location")
            .unwrap()
            .to_str()
            .unwrap();
        assert_eq!(location, "https://mysite.example.com/");
    }
}
