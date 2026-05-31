//! Webhook dispatcher for domain/cert/tunnel events.
//!
//! Sends HTTP POST requests with JSON payloads to configured webhook URLs.
//! Each request is signed with HMAC-SHA256 in the `X-Webhook-Signature` header.

use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use thiserror::Error;
use tracing::{debug, error, info, warn};

type HmacSha256 = Hmac<Sha256>;

/// Errors that can occur during webhook dispatch.
#[derive(Debug, Error)]
pub enum WebhookError {
    #[error("webhook URL not configured")]
    NotConfigured,

    #[error("HTTP request failed: {0}")]
    RequestFailed(String),

    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("HMAC error: {0}")]
    Hmac(String),
}

/// Event types that can be dispatched via webhooks.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum WebhookEventType {
    ProxyCreated,
    ProxyDisabled,
    DomainVerified,
    DomainRemoved,
}

impl std::fmt::Display for WebhookEventType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ProxyCreated => write!(f, "proxy.created"),
            Self::ProxyDisabled => write!(f, "proxy.disabled"),
            Self::DomainVerified => write!(f, "domain.verified"),
            Self::DomainRemoved => write!(f, "domain.removed"),
        }
    }
}

/// A webhook event payload.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WebhookEvent {
    pub event_type: String,
    pub timestamp: DateTime<Utc>,
    pub data: serde_json::Value,
}

impl WebhookEvent {
    /// Create a new webhook event.
    pub fn new(event_type: WebhookEventType, data: serde_json::Value) -> Self {
        Self {
            event_type: event_type.to_string(),
            timestamp: Utc::now(),
            data,
        }
    }

    /// Serialize to JSON bytes.
    pub fn to_json_bytes(&self) -> Result<Vec<u8>, WebhookError> {
        Ok(serde_json::to_vec(self)?)
    }

    /// Serialize to JSON string.
    pub fn to_json(&self) -> Result<String, WebhookError> {
        Ok(serde_json::to_string(self)?)
    }
}

/// Computes an HMAC-SHA256 signature for the given payload.
pub fn compute_signature(secret: &str, payload: &[u8]) -> Result<String, WebhookError> {
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| WebhookError::Hmac(e.to_string()))?;
    mac.update(payload);
    let result = mac.finalize().into_bytes();
    Ok(format!("sha256={}", hex::encode(result)))
}

/// Verifies an HMAC-SHA256 signature.
pub fn verify_signature(secret: &str, payload: &[u8], signature: &str) -> bool {
    match compute_signature(secret, payload) {
        Ok(expected) => {
            // Constant-time comparison
            let expected_bytes = expected.as_bytes();
            let sig_bytes = signature.as_bytes();
            if expected_bytes.len() != sig_bytes.len() {
                return false;
            }
            let mut result = 0u8;
            for (a, b) in expected_bytes.iter().zip(sig_bytes.iter()) {
                result |= a ^ b;
            }
            result == 0
        }
        Err(_) => false,
    }
}

/// Helper to encode bytes as hex.
mod hex {
    pub fn encode(bytes: &[u8]) -> String {
        bytes.iter().map(|b| format!("{b:02x}")).collect()
    }
}

/// Async webhook dispatcher.
pub struct WebhookDispatcher {
    client: reqwest::Client,
    url: String,
    secret: String,
}

impl WebhookDispatcher {
    /// Create a new dispatcher. Returns `None` if URL or secret is empty.
    pub fn new(url: String, secret: String) -> Option<Self> {
        if url.is_empty() || secret.is_empty() {
            return None;
        }
        Some(Self {
            client: reqwest::Client::new(),
            url,
            secret,
        })
    }

    /// Create a dispatcher that panics if misconfigured (for tests).
    pub fn new_unchecked(url: String, secret: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            url,
            secret,
        }
    }

    /// Dispatch a webhook event.
    pub async fn dispatch(&self, event_type: WebhookEventType, data: serde_json::Value) -> Result<(), WebhookError> {
        let event = WebhookEvent::new(event_type.clone(), data);
        let payload = event.to_json_bytes()?;
        let signature = compute_signature(&self.secret, &payload)?;

        debug!(
            event_type = %event_type,
            url = %self.url,
            "Dispatching webhook"
        );

        let response = self
            .client
            .post(&self.url)
            .header("content-type", "application/json")
            .header("x-webhook-signature", &signature)
            .body(payload)
            .send()
            .await
            .map_err(|e| WebhookError::RequestFailed(e.to_string()))?;

        let status = response.status();
        if status.is_success() {
            info!(event_type = %event_type, status = %status, "Webhook dispatched successfully");
            Ok(())
        } else {
            let body = response.text().await.unwrap_or_default();
            warn!(
                event_type = %event_type,
                status = %status,
                body = %body,
                "Webhook returned non-success status"
            );
            Err(WebhookError::RequestFailed(format!(
                "webhook returned {status}: {body}"
            )))
        }
    }

    /// Get the configured URL.
    pub fn url(&self) -> &str {
        &self.url
    }

    /// Compute the signature for a raw payload (useful for testing).
    pub fn sign_payload(&self, payload: &[u8]) -> Result<String, WebhookError> {
        compute_signature(&self.secret, payload)
    }
}

// ── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn event_type_display() {
        assert_eq!(WebhookEventType::ProxyCreated.to_string(), "proxy.created");
        assert_eq!(WebhookEventType::ProxyDisabled.to_string(), "proxy.disabled");
        assert_eq!(WebhookEventType::DomainVerified.to_string(), "domain.verified");
        assert_eq!(WebhookEventType::DomainRemoved.to_string(), "domain.removed");
    }

    #[test]
    fn event_type_serde_roundtrip() {
        let types = vec![
            WebhookEventType::ProxyCreated,
            WebhookEventType::ProxyDisabled,
            WebhookEventType::DomainVerified,
            WebhookEventType::DomainRemoved,
        ];
        for t in types {
            let json = serde_json::to_string(&t).unwrap();
            let back: WebhookEventType = serde_json::from_str(&json).unwrap();
            assert_eq!(t, back);
        }
    }

    #[test]
    fn webhook_event_creation() {
        let event = WebhookEvent::new(
            WebhookEventType::ProxyCreated,
            serde_json::json!({ "proxy_name": "my-app" }),
        );

        assert_eq!(event.event_type, "proxy.created");
        assert_eq!(event.data["proxy_name"], "my-app");
        assert!(event.timestamp <= Utc::now());
    }

    #[test]
    fn webhook_event_serialization() {
        let event = WebhookEvent::new(
            WebhookEventType::DomainVerified,
            serde_json::json!({ "host": "test.example.com" }),
        );

        let json = event.to_json().unwrap();
        assert!(json.contains("domain.verified"));
        assert!(json.contains("test.example.com"));
        assert!(json.contains("event_type"));
        assert!(json.contains("timestamp"));
    }

    #[test]
    fn webhook_event_json_bytes() {
        let event = WebhookEvent::new(
            WebhookEventType::ProxyDisabled,
            serde_json::json!({ "proxy_name": "app" }),
        );
        let bytes = event.to_json_bytes().unwrap();
        let parsed: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(parsed["event_type"], "proxy.disabled");
    }

    #[test]
    fn compute_signature_deterministic() {
        let secret = "my-secret";
        let payload = b"test payload";

        let sig1 = compute_signature(secret, payload).unwrap();
        let sig2 = compute_signature(secret, payload).unwrap();
        assert_eq!(sig1, sig2);
        assert!(sig1.starts_with("sha256="));
    }

    #[test]
    fn compute_signature_different_secrets() {
        let payload = b"test payload";
        let sig1 = compute_signature("secret1", payload).unwrap();
        let sig2 = compute_signature("secret2", payload).unwrap();
        assert_ne!(sig1, sig2);
    }

    #[test]
    fn compute_signature_different_payloads() {
        let secret = "my-secret";
        let sig1 = compute_signature(secret, b"payload1").unwrap();
        let sig2 = compute_signature(secret, b"payload2").unwrap();
        assert_ne!(sig1, sig2);
    }

    #[test]
    fn verify_signature_valid() {
        let secret = "my-secret";
        let payload = b"test payload";
        let sig = compute_signature(secret, payload).unwrap();
        assert!(verify_signature(secret, payload, &sig));
    }

    #[test]
    fn verify_signature_invalid() {
        let secret = "my-secret";
        let payload = b"test payload";
        assert!(!verify_signature(secret, payload, "sha256=invalid"));
    }

    #[test]
    fn verify_signature_wrong_secret() {
        let secret = "my-secret";
        let payload = b"test payload";
        let sig = compute_signature(secret, payload).unwrap();
        assert!(!verify_signature("wrong-secret", payload, &sig));
    }

    #[test]
    fn verify_signature_wrong_payload() {
        let secret = "my-secret";
        let sig = compute_signature(secret, b"original").unwrap();
        assert!(!verify_signature(secret, b"modified", &sig));
    }

    #[test]
    fn dispatcher_new_with_empty_url() {
        assert!(WebhookDispatcher::new("".into(), "secret".into()).is_none());
    }

    #[test]
    fn dispatcher_new_with_empty_secret() {
        assert!(WebhookDispatcher::new("http://example.com".into(), "".into()).is_none());
    }

    #[test]
    fn dispatcher_new_valid() {
        let d = WebhookDispatcher::new("http://example.com/hook".into(), "secret".into());
        assert!(d.is_some());
        assert_eq!(d.unwrap().url(), "http://example.com/hook");
    }

    #[test]
    fn dispatcher_sign_payload() {
        let d = WebhookDispatcher::new_unchecked(
            "http://example.com".into(),
            "secret".into(),
        );
        let sig = d.sign_payload(b"test").unwrap();
        assert!(sig.starts_with("sha256="));

        // Should be verifiable with the same secret
        assert!(verify_signature("secret", b"test", &sig));
    }

    #[test]
    fn event_serde_roundtrip_full() {
        let event = WebhookEvent::new(
            WebhookEventType::ProxyCreated,
            serde_json::json!({
                "proxy_name": "my-app",
                "proxy_type": "http",
                "local_port": 3000,
            }),
        );

        let json = serde_json::to_string(&event).unwrap();
        let back: WebhookEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(event.event_type, back.event_type);
        assert_eq!(event.data, back.data);
    }

    #[test]
    fn hex_encode() {
        assert_eq!(hex::encode(&[0x01, 0x23, 0xab, 0xff]), "0123abff");
    }

    #[test]
    fn all_event_types_serializable() {
        let event_types = [
            WebhookEventType::ProxyCreated,
            WebhookEventType::ProxyDisabled,
            WebhookEventType::DomainVerified,
            WebhookEventType::DomainRemoved,
        ];

        for et in &event_types {
            let event = WebhookEvent::new(et.clone(), serde_json::json!({"test": true}));
            let json = event.to_json().unwrap();
            assert!(json.contains(&et.to_string()));
        }
    }
}
