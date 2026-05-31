//! Circuit breaker for unhealthy tunnel backends.

use axum::body::Body;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

/// Circuit breaker states.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CircuitState {
    /// Healthy — requests pass through.
    Closed,
    /// Tripped — all requests fail fast with 503.
    Open,
    /// Probing — allow one request to test recovery.
    HalfOpen,
}

/// Circuit breaker configuration.
#[derive(Debug, Clone)]
pub struct CircuitBreakerConfig {
    /// Number of consecutive failures before tripping.
    pub failure_threshold: u32,
    /// Time to wait before entering half-open state.
    pub recovery_timeout: Duration,
}

impl Default for CircuitBreakerConfig {
    fn default() -> Self {
        Self {
            failure_threshold: 5,
            recovery_timeout: Duration::from_secs(30),
        }
    }
}

/// A circuit breaker that tracks backend health.
pub struct CircuitBreaker {
    config: CircuitBreakerConfig,
    state: std::sync::Mutex<CircuitBreakerInner>,
}

struct CircuitBreakerInner {
    state: CircuitState,
    consecutive_failures: u32,
    opened_at: Option<Instant>,
}

impl CircuitBreaker {
    pub fn new(config: CircuitBreakerConfig) -> Self {
        Self {
            config,
            state: std::sync::Mutex::new(CircuitBreakerInner {
                state: CircuitState::Closed,
                consecutive_failures: 0,
                opened_at: None,
            }),
        }
    }

    /// Get the current state (may transition Open → HalfOpen if timeout elapsed).
    pub fn state(&self) -> CircuitState {
        let mut inner = self.state.lock().unwrap();
        if inner.state == CircuitState::Open {
            if let Some(opened_at) = inner.opened_at {
                if opened_at.elapsed() >= self.config.recovery_timeout {
                    inner.state = CircuitState::HalfOpen;
                    return CircuitState::HalfOpen;
                }
            }
        }
        inner.state
    }

    /// Record a successful request.
    pub fn record_success(&self) {
        let mut inner = self.state.lock().unwrap();
        inner.consecutive_failures = 0;
        inner.state = CircuitState::Closed;
        inner.opened_at = None;
    }

    /// Record a failed request.
    pub fn record_failure(&self) {
        let mut inner = self.state.lock().unwrap();
        inner.consecutive_failures += 1;
        if inner.consecutive_failures >= self.config.failure_threshold {
            inner.state = CircuitState::Open;
            inner.opened_at = Some(Instant::now());
        }
    }

    /// Check if a request is allowed.
    /// Returns Ok(()) if allowed, Err(503) if circuit is open.
    pub fn allow_request(&self) -> Result<(), StatusCode> {
        match self.state() {
            CircuitState::Closed => Ok(()),
            CircuitState::HalfOpen => Ok(()), // allow one probe
            CircuitState::Open => Err(StatusCode::SERVICE_UNAVAILABLE),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_starts_closed() {
        let cb = CircuitBreaker::new(CircuitBreakerConfig::default());
        assert_eq!(cb.state(), CircuitState::Closed);
        assert!(cb.allow_request().is_ok());
    }

    #[test]
    fn test_trips_after_threshold_failures() {
        let config = CircuitBreakerConfig {
            failure_threshold: 3,
            recovery_timeout: Duration::from_secs(30),
        };
        let cb = CircuitBreaker::new(config);

        cb.record_failure();
        assert_eq!(cb.state(), CircuitState::Closed);
        cb.record_failure();
        assert_eq!(cb.state(), CircuitState::Closed);
        cb.record_failure();
        assert_eq!(cb.state(), CircuitState::Open);
        assert!(cb.allow_request().is_err());
    }

    #[test]
    fn test_success_resets() {
        let config = CircuitBreakerConfig {
            failure_threshold: 2,
            recovery_timeout: Duration::from_secs(30),
        };
        let cb = CircuitBreaker::new(config);

        cb.record_failure();
        cb.record_failure();
        assert_eq!(cb.state(), CircuitState::Open);

        cb.record_success();
        assert_eq!(cb.state(), CircuitState::Closed);
        assert!(cb.allow_request().is_ok());
    }

    #[test]
    fn test_recovery_timeout_transitions_to_half_open() {
        let config = CircuitBreakerConfig {
            failure_threshold: 1,
            recovery_timeout: Duration::from_millis(10),
        };
        let cb = CircuitBreaker::new(config);

        cb.record_failure();
        assert_eq!(cb.state(), CircuitState::Open);

        // Wait for recovery
        std::thread::sleep(Duration::from_millis(20));
        assert_eq!(cb.state(), CircuitState::HalfOpen);
        assert!(cb.allow_request().is_ok());
    }

    #[test]
    fn test_half_open_success_closes() {
        let config = CircuitBreakerConfig {
            failure_threshold: 1,
            recovery_timeout: Duration::from_millis(10),
        };
        let cb = CircuitBreaker::new(config);

        cb.record_failure();
        std::thread::sleep(Duration::from_millis(20));
        assert_eq!(cb.state(), CircuitState::HalfOpen);

        cb.record_success();
        assert_eq!(cb.state(), CircuitState::Closed);
    }

    #[test]
    fn test_half_open_failure_reopens() {
        let config = CircuitBreakerConfig {
            failure_threshold: 1,
            recovery_timeout: Duration::from_millis(10),
        };
        let cb = CircuitBreaker::new(config);

        cb.record_failure();
        std::thread::sleep(Duration::from_millis(20));
        assert_eq!(cb.state(), CircuitState::HalfOpen);

        cb.record_failure();
        assert_eq!(cb.state(), CircuitState::Open);
    }

    #[test]
    fn test_interleaved_success_resets_count() {
        let config = CircuitBreakerConfig {
            failure_threshold: 3,
            recovery_timeout: Duration::from_secs(30),
        };
        let cb = CircuitBreaker::new(config);

        cb.record_failure();
        cb.record_failure();
        cb.record_success(); // resets
        cb.record_failure();
        cb.record_failure();
        // Only 2 consecutive — should still be closed
        assert_eq!(cb.state(), CircuitState::Closed);
    }
}
