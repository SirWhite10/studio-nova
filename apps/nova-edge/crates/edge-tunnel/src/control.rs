//! Client connection + authentication.
//!
//! `TunnelSession` handles the lifecycle of a connected tunnel client:
//! 1. Read `Login` message
//! 2. Validate token against config
//! 3. Send `GeneralResponse` success/failure
//! 4. Enter main loop processing control messages

use crate::protocol::*;
use crate::registry::TunnelRegistry;
use crate::registry::TunnelClient;
use std::sync::Arc;
use tracing::{debug, info, warn, error};
use thiserror::Error;

/// Errors that can occur during tunnel session handling.
#[derive(Debug, Error)]
pub enum TunnelError {
    #[error("authentication failed: {0}")]
    AuthFailed(String),

    #[error("protocol error: {0}")]
    Protocol(String),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}

/// Result of processing a Login message.
#[derive(Debug, Clone, PartialEq)]
pub enum LoginResult {
    Accepted {
        run_id: String,
        version: String,
        hostname: String,
    },
    Rejected {
        reason: String,
    },
}

/// A session managing a single connected tunnel client.
pub struct TunnelSession {
    /// The expected tunnel token for authentication.
    expected_token: String,
    /// Shared registry for registering this client's proxies.
    registry: Arc<TunnelRegistry>,
}

impl TunnelSession {
    pub fn new(expected_token: String, registry: Arc<TunnelRegistry>) -> Self {
        Self {
            expected_token,
            registry,
        }
    }

    /// Process a raw Login message, validate the token, and return a LoginResult.
    /// Does NOT perform I/O — it only performs the authentication logic.
    pub fn process_login(&self, login: Login) -> LoginResult {
        if login.token != self.expected_token {
            warn!(
                run_id = %login.run_id,
                hostname = %login.hostname,
                "Authentication failed: invalid token"
            );
            return LoginResult::Rejected {
                reason: "invalid token".into(),
            };
        }

        info!(
            run_id = %login.run_id,
            version = %login.version,
            hostname = %login.hostname,
            pool_count = login.pool_count,
            "Client authenticated successfully"
        );

        LoginResult::Accepted {
            run_id: login.run_id,
            version: login.version,
            hostname: login.hostname,
        }
    }

    /// Build a GeneralResponse from a LoginResult.
    pub fn login_response(result: &LoginResult) -> GeneralResponse {
        match result {
            LoginResult::Accepted { .. } => GeneralResponse::ok(),
            LoginResult::Rejected { reason } => GeneralResponse::error(1, reason.clone()),
        }
    }

    /// Handle a complete login flow: validate, respond, register client.
    /// Returns the run_id on success, or an error.
    pub fn handle_login(
        &self,
        login: Login,
        proxy_names: Vec<String>,
    ) -> Result<String, TunnelError> {
        let result = self.process_login(login.clone());

        match result {
            LoginResult::Accepted { ref run_id, .. } => {
                let client = TunnelClient {
                    run_id: run_id.clone(),
                    proxy_names,
                    registered_at: std::time::Instant::now(),
                    last_seen: std::time::Instant::now(),
                };
                self.registry.register(client);
                Ok(run_id.clone())
            }
            LoginResult::Rejected { ref reason } => {
                Err(TunnelError::AuthFailed(reason.clone()))
            }
        }
    }

    /// Process a heartbeat from a client.
    pub fn handle_heartbeat(&self, heartbeat: Heartbeat, run_id: &str) -> GeneralResponse {
        debug!(run_id = %run_id, ts = heartbeat.timestamp, "Heartbeat received");
        if self.registry.touch(run_id) {
            GeneralResponse::ok()
        } else {
            GeneralResponse::error(2, "unknown client")
        }
    }

    /// Process a client disconnect: unregister from the registry.
    pub fn handle_disconnect(&self, run_id: &str) {
        info!(run_id = %run_id, "Client disconnected");
        self.registry.unregister(run_id);
    }

    /// Get a reference to the shared registry.
    pub fn registry(&self) -> &Arc<TunnelRegistry> {
        &self.registry
    }
}

// ── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_session(token: &str) -> TunnelSession {
        let registry = Arc::new(TunnelRegistry::new());
        TunnelSession::new(token.to_string(), registry)
    }

    fn make_login(token: &str) -> Login {
        Login {
            version: "0.61.0".into(),
            hostname: "worker-01".into(),
            run_id: "run-abc".into(),
            pool_count: 1,
            token: token.into(),
        }
    }

    // ── process_login ─────────────────────────────────────────────

    #[test]
    fn valid_token_accepted() {
        let session = make_session("correct-token");
        let login = make_login("correct-token");
        let result = session.process_login(login);

        assert_eq!(
            result,
            LoginResult::Accepted {
                run_id: "run-abc".into(),
                version: "0.61.0".into(),
                hostname: "worker-01".into(),
            }
        );
    }

    #[test]
    fn invalid_token_rejected() {
        let session = make_session("correct-token");
        let login = make_login("wrong-token");
        let result = session.process_login(login);

        match result {
            LoginResult::Rejected { reason } => {
                assert!(reason.contains("invalid token"));
            }
            LoginResult::Accepted { .. } => panic!("Expected rejection"),
        }
    }

    // ── login_response ────────────────────────────────────────────

    #[test]
    fn login_response_accepted_is_ok() {
        let result = LoginResult::Accepted {
            run_id: "r1".into(),
            version: "1.0".into(),
            hostname: "h".into(),
        };
        let resp = TunnelSession::login_response(&result);
        assert!(resp.is_ok());
        assert_eq!(resp.code, 0);
    }

    #[test]
    fn login_response_rejected_is_error() {
        let result = LoginResult::Rejected {
            reason: "bad".into(),
        };
        let resp = TunnelSession::login_response(&result);
        assert!(!resp.is_ok());
        assert_eq!(resp.code, 1);
        assert_eq!(resp.msg, "bad");
    }

    // ── handle_login (full flow) ──────────────────────────────────

    #[test]
    fn handle_login_valid_registers_client() {
        let session = make_session("secret");
        let login = make_login("secret");
        let result = session.handle_login(login, vec!["proxy-a".into()]);

        assert!(result.is_ok());
        let run_id = result.unwrap();
        assert_eq!(run_id, "run-abc");

        // Verify registered in the registry
        let registry = session.registry();
        assert_eq!(registry.client_count(), 1);
        let client = registry.get_client("run-abc").unwrap();
        assert_eq!(client.proxy_names, vec!["proxy-a"]);
    }

    #[test]
    fn handle_login_invalid_returns_error() {
        let session = make_session("secret");
        let login = make_login("wrong");
        let result = session.handle_login(login, vec!["proxy-a".into()]);

        assert!(result.is_err());
        match result.unwrap_err() {
            TunnelError::AuthFailed(reason) => {
                assert!(reason.contains("invalid token"));
            }
            other => panic!("Expected AuthFailed, got {other}"),
        }

        // Nothing registered
        assert_eq!(session.registry().client_count(), 0);
    }

    // ── handle_heartbeat ──────────────────────────────────────────

    #[test]
    fn heartbeat_known_client() {
        let session = make_session("secret");
        let login = make_login("secret");
        session.handle_login(login, vec![]).unwrap();

        let hb = Heartbeat { timestamp: 12345 };
        let resp = session.handle_heartbeat(hb, "run-abc");
        assert!(resp.is_ok());
    }

    #[test]
    fn heartbeat_unknown_client() {
        let session = make_session("secret");
        let hb = Heartbeat { timestamp: 12345 };
        let resp = session.handle_heartbeat(hb, "ghost");
        assert!(!resp.is_ok());
        assert_eq!(resp.code, 2);
    }

    // ── handle_disconnect ─────────────────────────────────────────

    #[test]
    fn disconnect_removes_client() {
        let session = make_session("secret");
        let login = make_login("secret");
        session.handle_login(login, vec!["proxy-a".into()]).unwrap();

        assert_eq!(session.registry().client_count(), 1);
        session.handle_disconnect("run-abc");
        assert_eq!(session.registry().client_count(), 0);
    }
}
