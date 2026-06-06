//! Backend health checker.
//!
//! Periodic health check for registered tunnel backends.
//! Tracks last_seen timestamp per client and marks clients as stale
//! after a configurable timeout.

use crate::registry::TunnelRegistry;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::{debug, info, warn};

/// Health status of a tunnel client.
#[derive(Debug, Clone, PartialEq)]
pub enum HealthStatus {
    Healthy,
    Stale {
        last_seen_ago_secs: f64,
    },
    Unknown,
}

impl HealthStatus {
    pub fn is_healthy(&self) -> bool {
        matches!(self, HealthStatus::Healthy)
    }
}

/// Configuration for the health checker.
#[derive(Debug, Clone)]
pub struct HealthCheckConfig {
    /// How long without activity before a client is considered stale.
    pub stale_timeout: Duration,
    /// How often to run health checks.
    pub check_interval: Duration,
}

impl Default for HealthCheckConfig {
    fn default() -> Self {
        Self {
            stale_timeout: Duration::from_secs(90),
            check_interval: Duration::from_secs(30),
        }
    }
}

/// Periodic health checker for tunnel backends.
pub struct HealthChecker {
    registry: Arc<TunnelRegistry>,
    config: HealthCheckConfig,
}

impl HealthChecker {
    pub fn new(registry: Arc<TunnelRegistry>, config: HealthCheckConfig) -> Self {
        Self { registry, config }
    }

    /// Check the health of a specific client by run_id.
    pub fn check_client(&self, run_id: &str) -> HealthStatus {
        let client = match self.registry.get_client(run_id) {
            Some(c) => c,
            None => return HealthStatus::Unknown,
        };

        let elapsed = client.last_seen.elapsed();
        if elapsed > self.config.stale_timeout {
            HealthStatus::Stale {
                last_seen_ago_secs: elapsed.as_secs_f64(),
            }
        } else {
            HealthStatus::Healthy
        }
    }

    /// Check all registered clients and return a map of run_id → HealthStatus.
    pub fn check_all(&self) -> Vec<(String, HealthStatus)> {
        self.registry
            .client_ids()
            .into_iter()
            .map(|id| {
                let status = self.check_client(&id);
                (id, status)
            })
            .collect()
    }

    /// Evict stale clients from the registry.
    /// Returns the list of evicted run_ids.
    pub fn evict_stale(&self) -> Vec<String> {
        let all = self.check_all();
        let mut evicted = Vec::new();

        for (run_id, status) in &all {
            if matches!(status, HealthStatus::Stale { .. }) {
                warn!(run_id = %run_id, "Evicting stale tunnel client");
                self.registry.unregister(run_id);
                evicted.push(run_id.clone());
            }
        }

        if !evicted.is_empty() {
            info!(count = evicted.len(), "Evicted stale clients");
        }

        evicted
    }

    /// Run a single health check pass and evict stale clients.
    pub fn run_check_cycle(&self) -> HealthCheckReport {
        let all = self.check_all();
        let mut healthy = Vec::new();
        let mut stale = Vec::new();
        let mut unknown = Vec::new();

        for (run_id, status) in &all {
            match status {
                HealthStatus::Healthy => healthy.push(run_id.clone()),
                HealthStatus::Stale { .. } => stale.push(run_id.clone()),
                HealthStatus::Unknown => unknown.push(run_id.clone()),
            }
        }

        // Evict stale
        for run_id in &stale {
            warn!(run_id = %run_id, "Evicting stale client");
            self.registry.unregister(run_id);
        }

        HealthCheckReport {
            healthy_count: healthy.len(),
            stale_count: stale.len(),
            evicted: stale,
        }
    }

    /// Get the stale timeout duration.
    pub fn stale_timeout(&self) -> Duration {
        self.config.stale_timeout
    }

    /// Get the check interval duration.
    pub fn check_interval(&self) -> Duration {
        self.config.check_interval
    }
}

/// Report from a health check cycle.
#[derive(Debug, Clone)]
pub struct HealthCheckReport {
    pub healthy_count: usize,
    pub stale_count: usize,
    pub evicted: Vec<String>,
}

// ── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::registry::TunnelClient;
    use std::thread;

    fn make_client(run_id: &str, proxy_names: &[&str]) -> TunnelClient {
        TunnelClient {
            run_id: run_id.to_string(),
            proxy_names: proxy_names.iter().map(|s| s.to_string()).collect(),
            connector: None,
            registered_at: Instant::now(),
            last_seen: Instant::now(),
        }
    }

    fn make_checker(registry: &Arc<TunnelRegistry>, timeout: Duration) -> HealthChecker {
        HealthChecker::new(
            registry.clone(),
            HealthCheckConfig {
                stale_timeout: timeout,
                check_interval: Duration::from_secs(10),
            },
        )
    }

    #[test]
    fn fresh_client_is_healthy() {
        let registry = Arc::new(TunnelRegistry::new());
        registry.register(make_client("run-1", &["proxy-a"]));

        let checker = make_checker(&registry, Duration::from_secs(90));
        let status = checker.check_client("run-1");

        assert_eq!(status, HealthStatus::Healthy);
        assert!(status.is_healthy());
    }

    #[test]
    fn stale_client_detected() {
        let registry = Arc::new(TunnelRegistry::new());
        registry.register(make_client("run-1", &["proxy-a"]));

        // Very short timeout so even a few ms makes it stale
        let checker = make_checker(&registry, Duration::from_millis(1));

        // Wait to exceed the timeout
        thread::sleep(Duration::from_millis(5));

        let status = checker.check_client("run-1");
        match status {
            HealthStatus::Stale { last_seen_ago_secs } => {
                assert!(last_seen_ago_secs > 0.0);
                assert!(!status.is_healthy());
            }
            other => panic!("Expected Stale, got {other:?}"),
        }
    }

    #[test]
    fn unknown_client() {
        let registry = Arc::new(TunnelRegistry::new());
        let checker = make_checker(&registry, Duration::from_secs(90));

        let status = checker.check_client("ghost");
        assert_eq!(status, HealthStatus::Unknown);
        assert!(!status.is_healthy());
    }

    #[test]
    fn check_all_clients() {
        let registry = Arc::new(TunnelRegistry::new());
        registry.register(make_client("run-1", &["proxy-a"]));
        registry.register(make_client("run-2", &["proxy-b"]));

        let checker = make_checker(&registry, Duration::from_secs(90));
        let results = checker.check_all();

        assert_eq!(results.len(), 2);
        for (_, status) in &results {
            assert!(status.is_healthy());
        }
    }

    #[test]
    fn evict_stale_removes_stale_clients() {
        let registry = Arc::new(TunnelRegistry::new());
        registry.register(make_client("run-1", &["proxy-a"]));

        let checker = make_checker(&registry, Duration::from_millis(1));
        thread::sleep(Duration::from_millis(5));

        let evicted = checker.evict_stale();
        assert_eq!(evicted.len(), 1);
        assert_eq!(evicted[0], "run-1");
        assert_eq!(registry.client_count(), 0);
    }

    #[test]
    fn evict_stale_keeps_healthy() {
        let registry = Arc::new(TunnelRegistry::new());
        registry.register(make_client("run-1", &["proxy-a"]));

        let checker = make_checker(&registry, Duration::from_secs(600));
        let evicted = checker.evict_stale();
        assert!(evicted.is_empty());
        assert_eq!(registry.client_count(), 1);
    }

    #[test]
    fn run_check_cycle() {
        let registry = Arc::new(TunnelRegistry::new());
        registry.register(make_client("healthy", &["proxy-a"]));
        registry.register(make_client("stale", &["proxy-b"]));

        // Create checker with a very short timeout
        let checker = make_checker(&registry, Duration::from_millis(1));

        // Touch the healthy client to keep it fresh
        thread::sleep(Duration::from_millis(5));
        registry.touch("healthy");

        let report = checker.run_check_cycle();
        assert_eq!(report.healthy_count, 1);
        assert_eq!(report.stale_count, 1);
        assert_eq!(report.evicted.len(), 1);
        assert_eq!(report.evicted[0], "stale");

        // Only the healthy one remains
        assert_eq!(registry.client_count(), 1);
        assert!(registry.get_client("healthy").is_some());
    }

    #[test]
    fn timeout_config_default() {
        let config = HealthCheckConfig::default();
        assert_eq!(config.stale_timeout, Duration::from_secs(90));
        assert_eq!(config.check_interval, Duration::from_secs(30));
    }

    #[test]
    fn checker_accessors() {
        let registry = Arc::new(TunnelRegistry::new());
        let config = HealthCheckConfig {
            stale_timeout: Duration::from_secs(60),
            check_interval: Duration::from_secs(15),
        };
        let checker = HealthChecker::new(registry, config);

        assert_eq!(checker.stale_timeout(), Duration::from_secs(60));
        assert_eq!(checker.check_interval(), Duration::from_secs(15));
    }
}
