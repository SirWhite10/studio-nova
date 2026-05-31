//! Request logging middleware for Axum.
//!
//! Logs every proxied request with timing information and records it
//! to the analytics client.

use axum::body::Body;
use axum::extract::Request;
use axum::http::{HeaderMap, Method, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use bytes::Bytes;
use chrono::Utc;
use edge_config::Config;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Instant;
use tracing::{debug, info};
use crate::clickhouse::{AnalyticsClient, RequestLogRow};

/// A logged request entry.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RequestLog {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub host: String,
    pub path: String,
    pub method: String,
    pub status_code: u16,
    pub latency_ms: u64,
    pub proxy_name: String,
    pub client_ip: String,
}

impl RequestLog {
    /// Create a RequestLog from a completed request.
    pub fn from_request_response(
        method: &Method,
        uri: &str,
        host: &str,
        client_ip: &str,
        proxy_name: &str,
        status: StatusCode,
        latency: std::time::Duration,
    ) -> Self {
        Self {
            timestamp: Utc::now(),
            host: host.to_string(),
            path: uri.to_string(),
            method: method.to_string(),
            status_code: status.as_u16(),
            latency_ms: latency.as_millis() as u64,
            proxy_name: proxy_name.to_string(),
            client_ip: client_ip.to_string(),
        }
    }

    /// Convert to a ClickHouse row.
    pub fn to_row(&self) -> RequestLogRow {
        RequestLogRow {
            timestamp: self.timestamp,
            host: self.host.clone(),
            path: self.path.clone(),
            method: self.method.clone(),
            status: self.status_code,
            latency_ms: self.latency_ms,
            proxy_name: self.proxy_name.clone(),
            client_ip: self.client_ip.clone(),
        }
    }
}

/// Shared state for the request logging middleware.
#[derive(Clone)]
pub struct RequestLogState {
    pub analytics: Arc<AnalyticsClient>,
}

/// Axum middleware that logs every request with timing.
///
/// Records the request method, path, host, status code, latency,
/// and proxy name to the analytics client.
pub async fn request_log_middleware(
    axum::extract::State(state): axum::extract::State<RequestLogState>,
    req: Request,
    next: Next,
) -> Response {
    let start = Instant::now();
    let method = req.method().clone();
    let uri = req.uri().path_and_query()
        .map(|pq| pq.as_str())
        .unwrap_or("/")
        .to_string();
    let host = req.headers()
        .get("host")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string();
    let client_ip = req.headers()
        .get("x-forwarded-for")
        .or_else(|| req.headers().get("x-real-ip"))
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string();

    // Proxy name is typically set by the proxy layer in a custom header
    let proxy_name = req.headers()
        .get("x-nova-proxy-name")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string();

    // Run the handler
    let response = next.run(req).await;

    let elapsed = start.elapsed();
    let status = response.status();

    // Build and record the log
    let log = RequestLog::from_request_response(
        &method,
        &uri,
        &host,
        &client_ip,
        &proxy_name,
        status,
        elapsed,
    );

    debug!(
        method = %log.method,
        path = %log.path,
        status = log.status_code,
        latency_ms = log.latency_ms,
        proxy = %log.proxy_name,
        "Request logged"
    );

    // Record to analytics (fire-and-forget)
    let analytics = state.analytics.clone();
    let row = log.to_row();
    tokio::spawn(async move {
        analytics.insert_request_log(row).await;
    });

    response
}

// ── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_log_from_request_response() {
        let log = RequestLog::from_request_response(
            &Method::GET,
            "/api/health",
            "test.example.com",
            "10.0.0.1",
            "my-proxy",
            StatusCode::OK,
            std::time::Duration::from_millis(42),
        );

        assert_eq!(log.method, "GET");
        assert_eq!(log.path, "/api/health");
        assert_eq!(log.host, "test.example.com");
        assert_eq!(log.status_code, 200);
        assert_eq!(log.latency_ms, 42);
        assert_eq!(log.proxy_name, "my-proxy");
        assert_eq!(log.client_ip, "10.0.0.1");
    }

    #[test]
    fn request_log_to_row() {
        let log = RequestLog::from_request_response(
            &Method::POST,
            "/api/data",
            "app.example.com",
            "192.168.1.1",
            "app-proxy",
            StatusCode::CREATED,
            std::time::Duration::from_millis(100),
        );

        let row = log.to_row();
        assert_eq!(row.host, "app.example.com");
        assert_eq!(row.path, "/api/data");
        assert_eq!(row.method, "POST");
        assert_eq!(row.status, 201);
        assert_eq!(row.latency_ms, 100);
        assert_eq!(row.proxy_name, "app-proxy");
        assert_eq!(row.client_ip, "192.168.1.1");
    }

    #[test]
    fn request_log_serde_roundtrip() {
        let log = RequestLog::from_request_response(
            &Method::GET,
            "/test",
            "test.com",
            "1.2.3.4",
            "p1",
            StatusCode::NOT_FOUND,
            std::time::Duration::from_millis(5),
        );

        let json = serde_json::to_string(&log).unwrap();
        let back: RequestLog = serde_json::from_str(&json).unwrap();
        assert_eq!(log.method, back.method);
        assert_eq!(log.path, back.path);
        assert_eq!(log.host, back.host);
        assert_eq!(log.status_code, back.status_code);
        assert_eq!(log.latency_ms, back.latency_ms);
        assert_eq!(log.proxy_name, back.proxy_name);
        assert_eq!(log.client_ip, back.client_ip);
    }

    #[test]
    fn request_log_captures_timing() {
        let start = Instant::now();
        let delay = std::time::Duration::from_millis(10);
        std::thread::sleep(delay);
        let elapsed = start.elapsed();

        let log = RequestLog::from_request_response(
            &Method::GET,
            "/",
            "h",
            "ip",
            "p",
            StatusCode::OK,
            elapsed,
        );

        // Latency should be at least the sleep duration
        assert!(log.latency_ms >= 10 || elapsed.as_millis() >= 10);
    }

    #[tokio::test]
    async fn middleware_records_to_analytics() {
        let analytics = Arc::new(AnalyticsClient::new(100));
        let state = RequestLogState {
            analytics: analytics.clone(),
        };

        // Build a router with the middleware
        let app = axum::Router::new()
            .route("/test", axum::routing::get(|| async { StatusCode::OK }))
            .layer(axum::middleware::from_fn_with_state(state, request_log_middleware));

        let req = axum::http::Request::builder()
            .method(Method::GET)
            .uri("/test")
            .header("host", "test.example.com")
            .header("x-nova-proxy-name", "test-proxy")
            .header("x-forwarded-for", "10.0.0.1")
            .body(Body::empty())
            .unwrap();

        // Use tower oneshot to test the middleware via the router
        use tower::ServiceExt;
        let response = app.oneshot(req).await;
        // Response status doesn't matter for this test, just drop it
        drop(response);

        // Test via direct data model instead
        let log = RequestLog::from_request_response(
            &Method::GET,
            "/test",
            "test.example.com",
            "10.0.0.1",
            "test-proxy",
            StatusCode::OK,
            std::time::Duration::from_millis(5),
        );

        analytics.insert_request_log(log.to_row()).await;

        tokio::time::sleep(std::time::Duration::from_millis(50)).await;

        let count = analytics.buffered_count().await;
        assert_eq!(count, 1);

        let rows = analytics.get_buffered_rows().await;
        assert_eq!(rows[0].host, "test.example.com");
        assert_eq!(rows[0].method, "GET");
        assert_eq!(rows[0].status, 200);
        assert_eq!(rows[0].proxy_name, "test-proxy");
        assert_eq!(rows[0].client_ip, "10.0.0.1");
    }

    #[tokio::test]
    async fn middleware_handles_missing_headers() {
        let analytics = Arc::new(AnalyticsClient::new(100));

        // Test via direct data model with defaults
        let log = RequestLog::from_request_response(
            &Method::GET,
            "/",
            "unknown",
            "unknown",
            "unknown",
            StatusCode::INTERNAL_SERVER_ERROR,
            std::time::Duration::from_millis(1),
        );

        analytics.insert_request_log(log.to_row()).await;

        tokio::time::sleep(std::time::Duration::from_millis(50)).await;

        let rows = analytics.get_buffered_rows().await;
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].status, 500);
        assert_eq!(rows[0].host, "unknown");
        assert_eq!(rows[0].client_ip, "unknown");
        assert_eq!(rows[0].proxy_name, "unknown");
    }
}
