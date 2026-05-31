//! Per-host rate limiting using token bucket (governor).

use axum::body::Body;
use axum::extract::State;
use axum::http::{Request, Response, StatusCode};
use axum::response::IntoResponse;
use governor::clock::QuantaClock;
use governor::middleware::NoOpMiddleware;
use governor::{DefaultKeyedRateLimiter, Quota, RateLimiter};
use http::header::HOST;
use std::num::NonZeroU32;
use std::sync::Arc;
use dashmap::DashMap;

/// Per-host rate limiter using governor's keyed rate limiter.
pub struct HostRateLimiter {
    limiter: DefaultKeyedRateLimiter<String>,
    burst: NonZeroU32,
}

impl HostRateLimiter {
    /// Create a new rate limiter with the given requests-per-second and burst size.
    pub fn new(rps: u32, burst: u32) -> Self {
        let burst = NonZeroU32::new(burst.max(1)).unwrap();
        let quota = Quota::per_second(NonZeroU32::new(rps.max(1)).unwrap())
            .allow_burst(burst);
        Self {
            limiter: RateLimiter::keyed(quota),
            burst,
        }
    }

    /// Check if a request from the given host is allowed.
    /// Returns true if allowed, false if rate limited.
    pub fn check(&self, host: &str) -> bool {
        match self.limiter.check_key(&host.to_string()) {
            Ok(_) => true,
            Err(_) => false,
        }
    }

    /// Get the configured burst size.
    pub fn burst_size(&self) -> u32 {
        self.burst.get()
    }
}

/// Axum middleware that checks rate limits per host.
pub async fn rate_limit_middleware(
    State(limiter): State<Arc<HostRateLimiter>>,
    request: Request<Body>,
) -> Response<Body> {
    let host = request
        .headers()
        .get(HOST)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown");

    if limiter.check(host) {
        // Allow — in a real pipeline we'd continue to next handler
        (StatusCode::OK, "ok").into_response()
    } else {
        (StatusCode::TOO_MANY_REQUESTS, "rate limited").into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_under_limit_passes() {
        let limiter = HostRateLimiter::new(10, 5);
        // Should allow the first request
        assert!(limiter.check("example.com"));
    }

    #[test]
    fn test_over_limit_rejects() {
        // Very low limit: 1 rps, burst 2
        let limiter = HostRateLimiter::new(1, 2);
        assert!(limiter.check("example.com"));
        assert!(limiter.check("example.com"));
        // Third should be rejected (burst exhausted)
        assert!(!limiter.check("example.com"));
    }

    #[test]
    fn test_different_hosts_independent() {
        let limiter = HostRateLimiter::new(1, 1);
        assert!(limiter.check("a.com"));
        // a.com is exhausted
        assert!(!limiter.check("a.com"));
        // b.com should still work
        assert!(limiter.check("b.com"));
    }

    #[test]
    fn test_burst_size() {
        let limiter = HostRateLimiter::new(10, 5);
        assert_eq!(limiter.burst_size(), 5);
    }
}
