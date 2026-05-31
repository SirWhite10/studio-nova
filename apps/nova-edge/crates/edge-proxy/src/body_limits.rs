//! Request body size limits.

use axum::body::Body;
use axum::http::{Request, Response, StatusCode};
use axum::response::IntoResponse;
use bytes::Bytes;
use http_body_util::BodyExt;
use std::sync::Arc;

/// Default max body size: 10 MB.
pub const DEFAULT_MAX_BODY_SIZE: usize = 10 * 1024 * 1024;

/// Configuration for body size limits.
#[derive(Debug, Clone)]
pub struct BodyLimitConfig {
    /// Maximum body size in bytes.
    pub max_bytes: usize,
    /// Override limits per proxy name.
    pub per_proxy: std::collections::HashMap<String, usize>,
}

impl Default for BodyLimitConfig {
    fn default() -> Self {
        Self {
            max_bytes: DEFAULT_MAX_BODY_SIZE,
            per_proxy: std::collections::HashMap::new(),
        }
    }
}

impl BodyLimitConfig {
    pub fn new(max_bytes: usize) -> Self {
        Self {
            max_bytes,
            per_proxy: std::collections::HashMap::new(),
        }
    }

    /// Get the body limit for a specific proxy.
    pub fn limit_for(&self, proxy_name: &str) -> usize {
        self.per_proxy
            .get(proxy_name)
            .copied()
            .unwrap_or(self.max_bytes)
    }
}

/// Check if a request body is within limits.
/// Returns Ok(body_bytes) if within limit, Err(413) if over.
pub async fn check_body_limit(
    request: Request<Body>,
    max_bytes: usize,
) -> Result<(Request<Bytes>, usize), Response<Body>> {
    let (parts, body) = request.into_parts();

    // Check Content-Length header first (fast path)
    if let Some(content_length) = parts.headers.get("content-length") {
        if let Ok(len) = content_length.to_str().unwrap_or("0").parse::<usize>() {
            if len > max_bytes {
                return Err((StatusCode::PAYLOAD_TOO_LARGE, "request body too large").into_response());
            }
        }
    }

    // Collect body bytes
    let bytes = body
        .collect()
        .await
        .map_err(|_| (StatusCode::BAD_REQUEST, "failed to read body").into_response())?
        .to_bytes();

    if bytes.len() > max_bytes {
        return Err((StatusCode::PAYLOAD_TOO_LARGE, "request body too large").into_response());
    }

    let size = bytes.len();
    let request = Request::from_parts(parts, bytes);
    Ok((request, size))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Request;

    #[test]
    fn test_default_limit() {
        let config = BodyLimitConfig::default();
        assert_eq!(config.max_bytes, DEFAULT_MAX_BODY_SIZE);
    }

    #[test]
    fn test_per_proxy_limit() {
        let mut config = BodyLimitConfig::new(1000);
        config.per_proxy.insert("small-api".to_string(), 100);
        assert_eq!(config.limit_for("small-api"), 100);
        assert_eq!(config.limit_for("other"), 1000);
    }

    #[tokio::test]
    async fn test_body_under_limit() {
        let body = Body::from(Bytes::from_static(b"hello"));
        let req = Request::builder()
            .uri("/test")
            .body(body)
            .unwrap();

        let result = check_body_limit(req, 1024).await;
        assert!(result.is_ok());
        let (_, size) = result.unwrap();
        assert_eq!(size, 5);
    }

    #[tokio::test]
    async fn test_body_over_limit() {
        let body = Body::from(Bytes::from(vec![0u8; 2000]));
        let req = Request::builder()
            .uri("/test")
            .body(body)
            .unwrap();

        let result = check_body_limit(req, 1024).await;
        assert!(result.is_err());
        let resp = result.unwrap_err();
        assert_eq!(resp.status(), StatusCode::PAYLOAD_TOO_LARGE);
    }

    #[tokio::test]
    async fn test_no_body_passes() {
        let req = Request::builder()
            .uri("/test")
            .body(Body::empty())
            .unwrap();

        let result = check_body_limit(req, 1024).await;
        assert!(result.is_ok());
        let (_, size) = result.unwrap();
        assert_eq!(size, 0);
    }

    #[tokio::test]
    async fn test_content_length_header_over_limit() {
        let req = Request::builder()
            .uri("/test")
            .header("content-length", "9999")
            .body(Body::empty()) // actual body is empty, but header says 9999
            .unwrap();

        let result = check_body_limit(req, 1024).await;
        // Fast path should catch it
        assert!(result.is_err());
    }
}
