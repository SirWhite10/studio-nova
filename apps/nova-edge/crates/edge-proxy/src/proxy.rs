//! Core reverse proxy handler.
//!
//! Forwards incoming HTTP requests to tunnel backends.

use axum::body::Body;
use axum::extract::State;
use axum::http::{Request, Response, StatusCode};
use axum::response::IntoResponse;
use bytes::Bytes;
use http_body_util::BodyExt;
use std::sync::Arc;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ProxyError {
    #[error("backend unavailable")]
    BackendUnavailable,
    #[error("backend error: {0}")]
    BackendError(String),
    #[error("connection timeout")]
    Timeout,
}

/// Trait for backend targets that can handle proxied requests.
#[async_trait::async_trait]
pub trait Backend: Send + Sync {
    async fn forward(&self, request: Request<Body>) -> Result<Response<Body>, ProxyError>;
}

/// A mock backend for testing that returns a fixed response.
pub struct MockBackend {
    pub status: StatusCode,
    pub body: Bytes,
}

impl MockBackend {
    pub fn new(status: StatusCode, body: &[u8]) -> Self {
        Self {
            status,
            body: Bytes::copy_from_slice(body),
        }
    }

    pub fn ok(body: &[u8]) -> Self {
        Self::new(StatusCode::OK, body)
    }
}

#[async_trait::async_trait]
impl Backend for MockBackend {
    async fn forward(&self, _request: Request<Body>) -> Result<Response<Body>, ProxyError> {
        Ok(Response::builder()
            .status(self.status)
            .body(Body::from(self.body.clone()))
            .unwrap())
    }
}

/// A backend that always fails — simulates a dead tunnel.
pub struct FailingBackend {
    pub error: ProxyError,
}

impl FailingBackend {
    pub fn unavailable() -> Self {
        Self {
            error: ProxyError::BackendUnavailable,
        }
    }
}

#[async_trait::async_trait]
impl Backend for FailingBackend {
    async fn forward(&self, _request: Request<Body>) -> Result<Response<Body>, ProxyError> {
        Err(ProxyError::BackendError(self.error.to_string()))
    }
}

/// The reverse proxy handler.
pub struct ProxyHandler {
    backend: Arc<dyn Backend>,
}

impl ProxyHandler {
    pub fn new(backend: Arc<dyn Backend>) -> Self {
        Self { backend }
    }

    /// Handle an incoming request by forwarding to the backend.
    pub async fn handle(&self, request: Request<Body>) -> Response<Body> {
        match self.backend.forward(request).await {
            Ok(response) => response,
            Err(e) => {
                tracing::warn!("proxy error: {}", e);
                let status = match &e {
                    ProxyError::BackendUnavailable => StatusCode::BAD_GATEWAY,
                    ProxyError::BackendError(_) => StatusCode::BAD_GATEWAY,
                    ProxyError::Timeout => StatusCode::GATEWAY_TIMEOUT,
                };
                (status, format!("proxy error: {}", e)).into_response()
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::{Request as HttpRequest, StatusCode};

    #[tokio::test]
    async fn test_mock_backend_returns_response() {
        let backend = Arc::new(MockBackend::ok(b"hello from backend"));
        let handler = ProxyHandler::new(backend);

        let req = HttpRequest::builder()
            .uri("/test")
            .body(Body::empty())
            .unwrap();

        let resp = handler.handle(req).await;
        assert_eq!(resp.status(), StatusCode::OK);

        let body = axum::body::to_bytes(resp.into_body(), 1024)
            .await
            .unwrap();
        assert_eq!(&body[..], b"hello from backend");
    }

    #[tokio::test]
    async fn test_failing_backend_returns_502() {
        let backend = Arc::new(FailingBackend::unavailable());
        let handler = ProxyHandler::new(backend);

        let req = HttpRequest::builder()
            .uri("/test")
            .body(Body::empty())
            .unwrap();

        let resp = handler.handle(req).await;
        assert_eq!(resp.status(), StatusCode::BAD_GATEWAY);
    }

    #[tokio::test]
    async fn test_mock_backend_custom_status() {
        let backend = Arc::new(MockBackend::new(StatusCode::NOT_FOUND, b"not here"));
        let handler = ProxyHandler::new(backend);

        let req = HttpRequest::builder()
            .uri("/missing")
            .body(Body::empty())
            .unwrap();

        let resp = handler.handle(req).await;
        assert_eq!(resp.status(), StatusCode::NOT_FOUND);
    }
}
