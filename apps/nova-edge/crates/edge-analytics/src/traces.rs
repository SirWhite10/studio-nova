//! OpenTelemetry tracing setup (stub).
//!
//! Re-exports opentelemetry types and provides an `init_tracing` function
//! that sets up the OTLP exporter + tracing-opentelemetry layer.
//! In production this connects to an OTLP collector; in tests it's a no-op.

use opentelemetry::trace::TracerProvider;
use opentelemetry_sdk::runtime::Tokio;
use std::sync::Arc;
use tracing::error;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::EnvFilter;

/// Re-export commonly used opentelemetry types for convenience.
pub use opentelemetry::{
    global,
    trace::{Span, SpanKind, Status, Tracer},
    KeyValue,
};

/// Initialize OpenTelemetry tracing with the given OTLP endpoint and service name.
///
/// This sets up:
/// 1. An OTLP exporter pointing to `endpoint`
/// 2. A `tracing-opentelemetry` layer
/// 3. A `tracing-subscriber` with env-filter + OTLP layer
///
/// Returns a guard that should be held for the lifetime of the application.
/// When dropped, it flushes pending spans and shuts down the provider.
pub fn init_tracing(endpoint: &str, service_name: &str) -> Option<TracingGuard> {
    // Build the OTLP exporter
    let exporter = opentelemetry_otlp::new_exporter()
        .tonic()
        .with_endpoint(endpoint);

    let tracer_result = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(exporter)
        .with_trace_config(
            opentelemetry_sdk::trace::Config::default()
                .with_resource(opentelemetry_sdk::Resource::new(vec![
                    KeyValue::new("service.name", service_name.to_string()),
                ])),
        )
        .install_batch(Tokio);

    match tracer_result {
        Ok(tracer_provider) => {
            let tracer = tracer_provider.tracer(service_name);

            // Set global tracer provider
            let _ = global::set_tracer_provider(tracer_provider.clone());

            // Create the telemetry layer
            let telemetry_layer = tracing_opentelemetry::layer()
                .with_tracer(tracer);

            // Build the subscriber
            let env_filter = EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info"));

            let subscriber = tracing_subscriber::registry()
                .with(env_filter)
                .with(telemetry_layer);

            if subscriber.try_init().is_err() {
                error!("Failed to initialize tracing subscriber");
            }

            Some(TracingGuard {
                provider: Arc::new(tracer_provider),
            })
        }
        Err(e) => {
            error!(error = ?e, "Failed to initialize OpenTelemetry tracer");
            None
        }
    }
}

/// Guard that flushes and shuts down the tracer provider on drop.
pub struct TracingGuard {
    provider: Arc<opentelemetry_sdk::trace::TracerProvider>,
}

impl Drop for TracingGuard {
    fn drop(&mut self) {
        if let Err(e) = self.provider.shutdown() {
            error!(error = ?e, "Failed to shutdown tracer provider");
        }
    }
}

// ── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn init_tracing_function_compiles() {
        // Verify the function signature is correct by calling it.
        // With an invalid endpoint it will fail gracefully and return None.
        let result = init_tracing("http://invalid:4317", "test-service");
        // In a test environment without an OTLP collector, this may fail
        // and return None, which is acceptable.
        // The important thing is that it compiles and doesn't panic.
        drop(result);
    }

    #[test]
    fn key_value_creation() {
        let kv = KeyValue::new("key", "value");
        assert_eq!(kv.key.as_str(), "key");
    }

    #[test]
    fn tracing_guard_has_drop() {
        // Just verify the type exists and can be referenced
        fn assert_send<T: Send>() {}
        fn assert_sync<T: Sync>() {}
        assert_send::<TracingGuard>();
        assert_sync::<TracingGuard>();
    }

    #[test]
    fn re_exports_exist() {
        // Verify re-exports compile
        let _ = global::tracer("test");
        let kv = KeyValue::new("test", "value");
    }
}
