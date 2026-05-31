//! X-Forwarded-* header injection middleware.

use axum::http::{HeaderMap, HeaderValue, Request};
use axum::body::Body;
use std::sync::Arc;
use rand::Rng;

/// Header constants.
pub const X_FORWARDED_FOR: &str = "X-Forwarded-For";
pub const X_FORWARDED_PROTO: &str = "X-Forwarded-Proto";
pub const X_FORWARDED_HOST: &str = "X-Forwarded-Host";
pub const X_REQUEST_ID: &str = "X-Request-Id";

/// Inject X-Forwarded-* headers into the request.
/// Returns a modified request with the headers added.
pub fn inject_forwarded_headers(
    mut request: Request<Body>,
    client_ip: &str,
) -> Request<Body> {
    let headers = request.headers_mut();

    // X-Forwarded-For: append to existing or create new
    if let Some(existing) = headers.get(X_FORWARDED_FOR).cloned() {
        let combined = format!(
            "{}, {}",
            existing.to_str().unwrap_or(""),
            client_ip
        );
        headers.insert(X_FORWARDED_FOR, HeaderValue::from_str(&combined).unwrap());
    } else {
        headers.insert(
            X_FORWARDED_FOR,
            HeaderValue::from_str(client_ip).unwrap(),
        );
    }

    // X-Forwarded-Proto: use https by default
    if headers.get(X_FORWARDED_PROTO).is_none() {
        headers.insert(
            X_FORWARDED_PROTO,
            HeaderValue::from_static("https"),
        );
    }

    // X-Forwarded-Host: copy from Host header
    if headers.get(X_FORWARDED_HOST).is_none() {
        if let Some(host) = headers.get("host").cloned() {
            headers.insert(X_FORWARDED_HOST, host);
        }
    }

    // X-Request-Id: generate unique ID
    if headers.get(X_REQUEST_ID).is_none() {
        let id = generate_request_id();
        headers.insert(
            X_REQUEST_ID,
            HeaderValue::from_str(&id).unwrap(),
        );
    }

    request
}

/// Generate a random request ID (16 hex chars).
fn generate_request_id() -> String {
    let mut rng = rand::rng();
    let val: u64 = rng.random();
    format!("{:016x}", val)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Request;

    #[test]
    fn test_injects_all_headers() {
        let req = Request::builder()
            .uri("/test")
            .header("host", "example.com")
            .body(Body::empty())
            .unwrap();

        let result = inject_forwarded_headers(req, "192.168.1.1");
        let headers = result.headers();

        assert_eq!(
            headers.get(X_FORWARDED_FOR).unwrap().to_str().unwrap(),
            "192.168.1.1"
        );
        assert_eq!(
            headers.get(X_FORWARDED_PROTO).unwrap().to_str().unwrap(),
            "https"
        );
        assert_eq!(
            headers.get(X_FORWARDED_HOST).unwrap().to_str().unwrap(),
            "example.com"
        );
        assert!(headers.get(X_REQUEST_ID).is_some());
        assert_eq!(headers.get(X_REQUEST_ID).unwrap().to_str().unwrap().len(), 16);
    }

    #[test]
    fn test_appends_existing_x_forwarded_for() {
        let req = Request::builder()
            .uri("/test")
            .header(X_FORWARDED_FOR, "10.0.0.1")
            .body(Body::empty())
            .unwrap();

        let result = inject_forwarded_headers(req, "192.168.1.1");
        let val = result.headers().get(X_FORWARDED_FOR).unwrap().to_str().unwrap();
        assert!(val.contains("10.0.0.1"));
        assert!(val.contains("192.168.1.1"));
        assert_eq!(val, "10.0.0.1, 192.168.1.1");
    }

    #[test]
    fn test_does_not_overwrite_existing_proto() {
        let req = Request::builder()
            .uri("/test")
            .header(X_FORWARDED_PROTO, "http")
            .body(Body::empty())
            .unwrap();

        let result = inject_forwarded_headers(req, "1.2.3.4");
        assert_eq!(
            result.headers().get(X_FORWARDED_PROTO).unwrap().to_str().unwrap(),
            "http"
        );
    }

    #[test]
    fn test_request_id_is_unique() {
        let req1 = Request::builder().uri("/").body(Body::empty()).unwrap();
        let req2 = Request::builder().uri("/").body(Body::empty()).unwrap();

        let r1 = inject_forwarded_headers(req1, "1.1.1.1");
        let r2 = inject_forwarded_headers(req2, "1.1.1.1");

        let id1 = r1.headers().get(X_REQUEST_ID).unwrap().to_str().unwrap();
        let id2 = r2.headers().get(X_REQUEST_ID).unwrap().to_str().unwrap();
        assert_ne!(id1, id2);
    }
}
