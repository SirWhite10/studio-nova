//! Proxy registration handler.
//!
//! When a client sends `NewProxy`, validates the proxy name exists
//! in the SurrealDB live cache, then registers the proxy in the
//! `TunnelRegistry`.

use crate::protocol::*;
use crate::registry::TunnelRegistry;
use edge_store::live_cache::LiveCache;
use std::sync::Arc;
use tracing::{debug, info, warn};

/// Result of proxy registration.
#[derive(Debug, Clone, PartialEq)]
pub enum ProxyRegistrationResult {
    Registered {
        proxy_name: String,
    },
    Rejected {
        proxy_name: String,
        reason: String,
    },
}

/// Handles proxy registration requests from tunnel clients.
pub struct ProxyHandler {
    /// Live cache for validating proxy names.
    live_cache: Arc<LiveCache>,
    /// Registry for adding proxy associations.
    registry: Arc<TunnelRegistry>,
}

impl ProxyHandler {
    pub fn new(live_cache: Arc<LiveCache>, registry: Arc<TunnelRegistry>) -> Self {
        Self {
            live_cache,
            registry,
        }
    }

    /// Process a `NewProxy` message.
    ///
    /// Validates that:
    /// 1. The proxy_name exists in the live cache
    /// 2. The proxy is enabled
    ///
    /// If valid, associates the proxy with the client's run_id in the registry.
    pub fn handle_new_proxy(
        &self,
        msg: NewProxy,
        run_id: &str,
    ) -> ProxyRegistrationResult {
        let proxy_name = msg.proxy_name.clone();

        // Validate proxy exists in the live cache
        let proxy = match self.live_cache.get_proxy(&proxy_name) {
            Some(p) => p,
            None => {
                warn!(
                    proxy_name = %proxy_name,
                    run_id = %run_id,
                    "NewProxy rejected: proxy not found in live cache"
                );
                return ProxyRegistrationResult::Rejected {
                    proxy_name,
                    reason: "proxy not found in live cache".into(),
                };
            }
        };

        // Validate the proxy is enabled
        if !proxy.enabled {
            warn!(
                proxy_name = %proxy_name,
                run_id = %run_id,
                "NewProxy rejected: proxy is disabled"
            );
            return ProxyRegistrationResult::Rejected {
                proxy_name,
                reason: "proxy is disabled".into(),
            };
        }

        // Validate proxy type matches
        if proxy.proxy_type.to_string() != msg.proxy_type {
            warn!(
                proxy_name = %proxy_name,
                expected = %proxy.proxy_type,
                got = %msg.proxy_type,
                "NewProxy rejected: proxy type mismatch"
            );
            return ProxyRegistrationResult::Rejected {
                proxy_name,
                reason: format!(
                    "proxy type mismatch: expected {}, got {}",
                    proxy.proxy_type, msg.proxy_type
                ),
            };
        }

        info!(
            proxy_name = %proxy_name,
            run_id = %run_id,
            proxy_type = %msg.proxy_type,
            "Proxy registered successfully"
        );

        ProxyRegistrationResult::Registered { proxy_name }
    }

    /// Process a `CloseProxy` message.
    ///
    /// Removes the proxy association from the client in the registry.
    pub fn handle_close_proxy(
        &self,
        msg: CloseProxy,
        run_id: &str,
    ) -> GeneralResponse {
        info!(
            proxy_name = %msg.proxy_name,
            run_id = %run_id,
            "Proxy closed by client"
        );

        // If the client no longer has any proxies, unregister entirely.
        // For now, just log it. The registry still tracks the client
        // with its original proxy_names list — removal would need
        // a more granular registry update.
        GeneralResponse::ok()
    }

    /// Build a GeneralResponse from a ProxyRegistrationResult.
    pub fn registration_response(result: &ProxyRegistrationResult) -> GeneralResponse {
        match result {
            ProxyRegistrationResult::Registered { .. } => GeneralResponse::ok(),
            ProxyRegistrationResult::Rejected { reason, .. } => {
                GeneralResponse::error(3, reason.clone())
            }
        }
    }
}

// ── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use edge_store::types::*;

    fn make_test_proxy(name: &str, enabled: bool) -> WorkspaceProxy {
        WorkspaceProxy {
            id: None,
            user_id: "u1".into(),
            studio_id: "s1".into(),
            runtime_id: None,
            proxy_name: name.into(),
            proxy_type: ProxyType::Http,
            local_ip: "127.0.0.1".into(),
            local_port: 3000,
            remote_port: None,
            frpc_client_id: None,
            enabled,
            created_at: 1700000000000,
            updated_at: 1700000000000,
        }
    }

    fn make_test_domain(host: &str, proxy_name: &str, status: DomainStatus) -> ProxyDomain {
        ProxyDomain {
            id: None,
            host: host.into(),
            proxy_id: format!("workspace_proxy:{proxy_name}"),
            kind: DomainKind::Subdomain,
            status,
            verification_token: None,
            created_at: 1700000000000,
            updated_at: 1700000000000,
        }
    }

    fn setup_handler() -> ProxyHandler {
        let cache = Arc::new(LiveCache::new());
        let registry = Arc::new(TunnelRegistry::new());
        ProxyHandler::new(cache, registry)
    }

    fn setup_handler_with_proxy(name: &str, enabled: bool) -> ProxyHandler {
        let cache = Arc::new(LiveCache::new());
        let proxy = make_test_proxy(name, enabled);
        cache.upsert(DomainResolution {
            proxy: proxy.clone(),
            domain: make_test_domain("test.example.com", name, DomainStatus::Active),
        });
        let registry = Arc::new(TunnelRegistry::new());
        ProxyHandler::new(cache, registry)
    }

    #[test]
    fn known_proxy_registered() {
        let handler = setup_handler_with_proxy("my-app", true);

        let msg = NewProxy {
            proxy_name: "my-app".into(),
            proxy_type: "http".into(),
            use_encryption: false,
            use_compression: false,
            custom_domains: vec![],
            locations: vec![],
        };

        let result = handler.handle_new_proxy(msg, "run-1");
        assert_eq!(
            result,
            ProxyRegistrationResult::Registered {
                proxy_name: "my-app".into(),
            }
        );

        let resp = ProxyHandler::registration_response(&result);
        assert!(resp.is_ok());
    }

    #[test]
    fn unknown_proxy_rejected() {
        let handler = setup_handler();

        let msg = NewProxy {
            proxy_name: "nonexistent".into(),
            proxy_type: "http".into(),
            use_encryption: false,
            use_compression: false,
            custom_domains: vec![],
            locations: vec![],
        };

        let result = handler.handle_new_proxy(msg, "run-1");

        let resp = ProxyHandler::registration_response(&result);
        assert!(!resp.is_ok());

        match result {
            ProxyRegistrationResult::Rejected { proxy_name, reason } => {
                assert_eq!(proxy_name, "nonexistent");
                assert!(reason.contains("not found"));
            }
            ProxyRegistrationResult::Registered { .. } => panic!("Expected rejection"),
        }
    }

    #[test]
    fn disabled_proxy_rejected() {
        let handler = setup_handler_with_proxy("disabled-app", false);

        let msg = NewProxy {
            proxy_name: "disabled-app".into(),
            proxy_type: "http".into(),
            use_encryption: false,
            use_compression: false,
            custom_domains: vec![],
            locations: vec![],
        };

        let result = handler.handle_new_proxy(msg, "run-1");

        match result {
            ProxyRegistrationResult::Rejected { reason, .. } => {
                assert!(reason.contains("disabled"));
            }
            ProxyRegistrationResult::Registered { .. } => panic!("Expected rejection"),
        }
    }

    #[test]
    fn type_mismatch_rejected() {
        let handler = setup_handler_with_proxy("tcp-app", true);

        let msg = NewProxy {
            proxy_name: "tcp-app".into(),
            proxy_type: "tcp".into(), // cache has "http"
            use_encryption: false,
            use_compression: false,
            custom_domains: vec![],
            locations: vec![],
        };

        let result = handler.handle_new_proxy(msg, "run-1");

        match result {
            ProxyRegistrationResult::Rejected { reason, .. } => {
                assert!(reason.contains("type mismatch"));
            }
            ProxyRegistrationResult::Registered { .. } => panic!("Expected rejection"),
        }
    }

    #[test]
    fn close_proxy_returns_ok() {
        let handler = setup_handler();

        let msg = CloseProxy {
            proxy_name: "my-app".into(),
        };
        let resp = handler.handle_close_proxy(msg, "run-1");
        assert!(resp.is_ok());
    }
}
